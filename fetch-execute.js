/* Fetch–Execute cycle simulator.
   Teaching machine: 16 cells of 8 bits, 4-bit addresses, one accumulator.
   Micro-steps follow the Week 8 "Systems" lecture:
   PC→MAR, address-bus read, PC+1, memory→MDR, MDR→CIR, decode, execute.
   Memory is fully editable, and a "bug watch" explains what goes wrong when a design is wrong. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const LIMIT = 5000; // instructions before the simulator pauses itself

  /* ---------------------------------------------------------------- ISA */
  const OPS = [
    { code: 0, name: "HLT", operand: false, summary: "Stop the CPU.", detail: "The Control Unit stops the clock; nothing more is fetched. (Every cell holding 0 is a HLT.)" },
    { code: 1, name: "LOAD", operand: true, summary: "ACC ← memory[address]", detail: "Copy the value stored at the address into the accumulator." },
    { code: 2, name: "STO", operand: true, summary: "memory[address] ← ACC", detail: "Store the accumulator into memory at the address." },
    { code: 3, name: "ADD", operand: true, summary: "ACC ← ACC + memory[address]", detail: "The ALU adds the stored value to ACC (8-bit, wraps at 256)." },
    { code: 4, name: "SUB", operand: true, summary: "ACC ← ACC − memory[address]", detail: "The ALU subtracts the stored value from ACC (wraps below 0)." },
    { code: 5, name: "AND", operand: true, summary: "ACC ← ACC AND memory[address]", detail: "Bitwise AND of ACC with the stored value." },
    { code: 6, name: "OR", operand: true, summary: "ACC ← ACC OR memory[address]", detail: "Bitwise OR of ACC with the stored value." },
    { code: 7, name: "JMP", operand: true, summary: "PC ← address", detail: "Jump: the next instruction is fetched from the address." },
    { code: 8, name: "JZ", operand: true, summary: "if ACC = 0 then PC ← address", detail: "Jump only if the accumulator is zero; otherwise carry on." },
    { code: 9, name: "IN", operand: false, summary: "ACC ← input device", detail: "Read the number set in the Input box into ACC." },
    { code: 10, name: "OUT", operand: false, summary: "output ← ACC", detail: "Send the accumulator to the Output device." },
  ];
  const BY_CODE = Object.fromEntries(OPS.map((o) => [o.code, o]));
  const BY_NAME = Object.fromEntries(OPS.map((o) => [o.name, o]));

  /* ---------------------------------------------------------- formatting */
  let notation = "bin"; // bin | dec | hex
  const bin = (v, bits) =>
    v == null ? "—" : v.toString(2).padStart(bits, "0").replace(/(\d{4})(?=\d)/g, "$1 ");
  const fmtVal = (v, bits) =>
    v == null ? "—" : notation === "bin" ? bin(v, bits) : notation === "hex" ? "0x" + v.toString(16).toUpperCase().padStart(bits / 4, "0") : String(v);
  const altVal = (v, bits) => (v == null ? "" : notation === "dec" ? bin(v, bits) : "= " + v);
  const V = (v, bits) => `<code>${esc(bin(v, bits))}</code> (${v})`;
  const decode = (v) => ({ op: v >> 4, operand: v & 15, info: BY_CODE[v >> 4] || null });
  const disasm = (v) => {
    const d = decode(v);
    if (!d.info) return `?? (opcode ${d.op})`;
    return d.info.operand ? `${d.info.name} ${d.operand}` : d.info.name;
  };

  function parseCell(text) {
    const t = String(text).trim().toUpperCase();
    if (!t) return null;
    let m = t.match(/^(HLT|IN|OUT)(?:\s+\d+)?$/);
    if (m) return { value: BY_NAME[m[1]].code << 4, kind: "code" };
    m = t.match(/^(LOAD|STO|ADD|SUB|AND|OR|JMP|JZ)\s+(\d{1,2})$/);
    if (m) {
      const a = Number(m[2]);
      return a > 15 ? null : { value: (BY_NAME[m[1]].code << 4) | a, kind: "code" };
    }
    if (/^0B[01]{1,8}$/.test(t)) return { value: parseInt(t.slice(2), 2), kind: "data" };
    if (/^0X[0-9A-F]{1,2}$/.test(t)) return { value: parseInt(t.slice(2), 16), kind: "data" };
    if (/^\d{1,3}$/.test(t) && Number(t) <= 255) return { value: Number(t), kind: "data" };
    return null;
  }

  /* ------------------------------------------------------------- presets */
  const PRESETS = {
    deck: { group: "From the lecture", label: "Lecture example: LOAD 4, ADD 5, STO 6 (as on the slides)",
      desc: "The worked example from the slides. Memory starts at address 1 (PC = 1). Cells 4 and 5 hold the data 101 and 143; the result is stored in cell 6. The slides stop after STO 6, but the machine does not know that: it carries on and fetches cell 4. Watch what it does, and compare with the next program.",
      pc: 1, cells: { 1: "LOAD 4", 2: "ADD 5", 3: "STO 6", 4: 101, 5: 143, 6: 0 } },
    deckhlt: { group: "From the lecture", label: "Lecture example with a HLT (clean finish)",
      desc: "The same three instructions, with the data moved up one cell to make room for HLT in cell 4: 101 + 143 is stored in cell 7 and the machine stops cleanly.",
      pc: 1, cells: { 1: "LOAD 5", 2: "ADD 6", 3: "STO 7", 4: "HLT", 5: 101, 6: 143, 7: 0 } },
    sub: { group: "Try next", label: "Subtract, store and output",
      desc: "Computes 50 − 8, stores the answer in cell 10 and prints it.",
      pc: 0, cells: { 0: "LOAD 8", 1: "SUB 9", 2: "STO 10", 3: "OUT", 4: "HLT", 8: 50, 9: 8 } },
    sum3: { group: "Try next", label: "Add three numbers",
      desc: "12 + 30 + 5. Each ADD works on whatever the accumulator already holds. The total is stored in cell 13 and printed.",
      pc: 0, cells: { 0: "LOAD 10", 1: "ADD 11", 2: "ADD 12", 3: "STO 13", 4: "OUT", 5: "HLT", 10: 12, 11: 30, 12: 5 } },
    logic: { group: "Try next", label: "Logic: AND and OR",
      desc: "The ALU also does logic. ACC is combined with a mask bit by bit: 11001010 AND 00001111, then OR.",
      pc: 0, cells: { 0: "LOAD 8", 1: "AND 9", 2: "OUT", 3: "LOAD 8", 4: "OR 9", 5: "OUT", 6: "HLT", 8: 202, 9: 15 } },
    overflow: { group: "Try next", label: "8-bit overflow (200 + 100)",
      desc: "The accumulator holds only 8 bits, so 200 + 100 does not give 300. Watch what the ALU produces.",
      pc: 0, cells: { 0: "LOAD 8", 1: "ADD 9", 2: "OUT", 3: "HLT", 8: 200, 9: 100 } },
    input: { group: "Try next", label: "Input → add 10 → output",
      desc: "Uses the Input device. Change the number in the Input box, then Reset and run again.",
      pc: 0, cells: { 0: "IN", 1: "ADD 8", 2: "OUT", 3: "HLT", 8: 10 } },
    countdown: { group: "Try next", label: "Loop: count down 3, 2, 1 (JZ / JMP)",
      desc: "A loop. Cell 12 is a counter, cell 13 is the constant 1. JZ ends the loop when the counter reaches 0; JMP goes back to the start.",
      pc: 0, cells: { 0: "LOAD 12", 1: "JZ 6", 2: "OUT", 3: "SUB 13", 4: "STO 12", 5: "JMP 0", 6: "HLT", 12: 3, 13: 1 } },
    multiply: { group: "Try next", label: "Multiply 6 × 4 by repeated addition",
      desc: "There is no multiply instruction, so the program adds 6 to a running total four times. Cell 13 counts down, cell 14 is 6, cell 15 is the total, cell 12 is the constant 1.",
      pc: 0, cells: { 0: "LOAD 13", 1: "JZ 8", 2: "SUB 12", 3: "STO 13", 4: "LOAD 15", 5: "ADD 14", 6: "STO 15", 7: "JMP 0", 8: "LOAD 15", 9: "OUT", 10: "HLT", 12: 1, 13: 4, 14: 6, 15: 0 } },
    selfmod: { group: "Try next", label: "Von Neumann twist: data becomes code",
      desc: "Instructions and data share one memory, so a program can write an instruction. Cell 5 holds the bits 1010 0000 as plain data. STO copies them over cell 3 (HLT), and cell 3 then runs as OUT. The bug watch will flag the overwrite; here it is deliberate.",
      pc: 0, cells: { 0: "LOAD 5", 1: "STO 3", 2: "LOAD 6", 3: "HLT", 4: "HLT", 5: 160, 6: 42 } },

    bug1: { group: "Bugs to diagnose", label: "Bug 1: the program has no HLT",
      desc: "Intended: print 25 + 17 and stop. Press Run and watch the accumulator after the OUT.",
      spoiler: "After OUT there is no HLT, so the PC walks straight into cells 3 and 4, which hold the data 25 and 17. The CPU cannot tell data from instructions, so it executes them as LOAD 9 and LOAD 1 and quietly changes the accumulator. Fix: put HLT in cell 3 and move the data elsewhere.",
      pc: 0, cells: { 0: "LOAD 3", 1: "ADD 4", 2: "OUT", 3: 25, 4: 17 } },
    bug2: { group: "Bugs to diagnose", label: "Bug 2: off-by-one operand",
      desc: "Intended: print 10 + 5 = 15. Run it and check the output. Does the machine complain?",
      spoiler: "LOAD 7 should have been LOAD 8 and ADD 8 should have been ADD 9. The program runs perfectly, no warning, and prints 10: the worst kind of bug, because the machine did exactly what it was told. Trace which cells were read.",
      pc: 0, cells: { 0: "LOAD 7", 1: "ADD 8", 2: "OUT", 3: "HLT", 8: 10, 9: 5 } },
    bug3: { group: "Bugs to diagnose", label: "Bug 3: the loop that never ends",
      desc: "Intended: count down from 3 in steps of 2 and stop at 0. Press Max speed and see what happens.",
      spoiler: "The counter goes 3, 1, 255, 253, … It skips over 0 (odd numbers never reach 0 when subtracting 2), wraps around at 8 bits and eventually repeats exactly. JZ tests for equality, so use a counter that hits 0 exactly, or a different design.",
      pc: 0, cells: { 0: "LOAD 12", 1: "JZ 6", 2: "OUT", 3: "SUB 13", 4: "STO 12", 5: "JMP 0", 6: "HLT", 12: 3, 13: 2 } },
    bug4: { group: "Bugs to diagnose", label: "Bug 4: jump into data",
      desc: "Intended: print 100 + 90 and stop. Step through the end of the program.",
      spoiler: "JMP 8 was meant to be HLT. Cell 8 holds the result, 190 = 1011 1110. The top four bits, 1011, are opcode 11, which does not exist, so the Control Unit faults. Data was executed as code.",
      pc: 0, cells: { 0: "LOAD 6", 1: "ADD 7", 2: "STO 8", 3: "OUT", 4: "JMP 8", 6: 100, 7: 90 } },
    bug5: { group: "Bugs to diagnose", label: "Bug 5: overwriting your own program",
      desc: "Intended: store 7 in cell 9, then print 7 + 7. Run it. Why is there no output?",
      spoiler: "STO 2 should have been STO 9. It overwrote cell 2 (the ADD) with the data 7, which decodes as HLT. The program stops before OUT runs. Instructions live in the same memory as data, so a stray STO can destroy the program.",
      pc: 0, cells: { 0: "LOAD 8", 1: "STO 2", 2: "ADD 8", 3: "OUT", 4: "HLT", 8: 7 } },

    blank: { group: "Design your own", label: "Blank memory (write your own)",
      desc: "Every cell is 0, which decodes as HLT. Type instructions such as LOAD 8 or numbers such as 25 into the Meaning column.",
      pc: 0, cells: {} },
  };

  /* --------------------------------------------------------------- state */
  const blankState = () => ({
    mem: Array(16).fill(0), kind: Array(16).fill("data"), intent: Array(16).fill("data"), written: Array(16).fill(false),
    pc: 0, mar: null, mdr: null, cir: null, acc: null,
    alu: { a: null, b: null, op: "", res: null, zero: null },
    decoded: null, out: [], stepIdx: 0, cycles: 0, memAccess: 0,
    halted: false, fault: false, fetchAddr: null, note: "", log: [], last: null,
    warnings: [], warnKeys: {}, warnAddrs: {}, seen: {}, loopDetected: false, limitHit: false,
  });

  let initial = { mem: Array(16).fill(0), kind: Array(16).fill("data"), pc: 0 };
  let S = blankState();
  let history = [];
  let speedIdx = 2;
  const SPEEDS = [0.25, 0.5, 1, 2, 4, Infinity];
  const speed = () => SPEEDS[speedIdx];
  let busy = false, running = false, abort = false, epoch = 0;
  let currentPreset = "deck";

  const inputVal = () => {
    const n = Number($("#input-val").value);
    return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 0;
  };

  function resetCpu() {
    epoch++; busy = false; running = false; abort = true;
    S = blankState();
    S.mem = [...initial.mem];
    S.kind = [...initial.kind];
    S.intent = [...initial.kind];
    S.pc = initial.pc;
    history = [];
  }

  function setInitial(mem, kind, pc) {
    initial = { mem, kind, pc };
    $("#start-pc").value = pc;
    resetCpu();
    $("#out-list").innerHTML = "";
  }

  function loadPreset(key) {
    const p = PRESETS[key];
    currentPreset = key;
    const mem = Array(16).fill(0), kind = Array(16).fill("data");
    for (const [a, v] of Object.entries(p.cells)) {
      const parsed = typeof v === "number" ? { value: v, kind: "data" } : parseCell(v);
      mem[a] = parsed.value; kind[a] = parsed.kind;
    }
    $("#preset-desc").textContent = p.desc;
    const sp = $("#spoiler");
    sp.hidden = !p.spoiler;
    sp.open = false;
    $("#spoiler-text").textContent = p.spoiler || "";
    setInitial(mem, kind, p.pc);
  }

  /* ----------------------------------------------------------- bug watch */
  function warn(s, key, level, text, addr) {
    if (s.warnKeys[key]) return;
    s.warnKeys[key] = 1;
    s.warnings.push({ n: s.cycles + 1, level, text });
    if (addr != null) s.warnAddrs[addr] = 1;
  }

  /* ----------------------------------------------------- micro-step table */
  const FETCH = [
    {
      phase: "Fetch", title: "Copy the PC into the MAR", src: "pc", dst: "mar", bus: "int", bits: 4,
      val: (s) => s.pc, hl: ["pc", "mar", "cu"],
      text: (s) => `The Control Unit copies the address in the <b>Program Counter</b> (${V(s.pc, 4)}) into the <b>Memory Address Register</b>. The PC always holds the address of the <i>next</i> instruction to fetch.`,
      apply: (s) => { s.mar = s.pc; s.fetchAddr = s.pc; s.decoded = null; s.note = ""; },
    },
    {
      phase: "Fetch", title: "Send the address to memory (READ)", src: "mar", dst: "mem", bus: "addr", ctrl: "READ", bits: 4,
      val: (s) => s.mar, hl: ["mar", "mem", "cu"], memRow: "read",
      text: (s) => `The address ${V(s.mar, 4)} travels along the <b>address bus</b> to memory, while the Control Unit puts a <b>READ</b> signal on the control bus. Memory finds cell ${s.mar}.`,
      apply: () => {},
    },
    {
      phase: "Fetch", title: "Increment the PC", src: null, dst: "pc", bus: "int", bits: 4,
      val: (s) => (s.pc + 1) & 15, hl: ["pc", "cu"],
      text: (s) => `The PC is increased by one, from ${s.pc} to ${(s.pc + 1) & 15}, so it already points at the next instruction. (Jump instructions will overwrite it later.)`,
      apply: (s) => {
        if (s.pc === 15) warn(s, "pcwrap", "warn", "The PC went past the last cell (15) and <b>wrapped round to 0</b>: the program ran off the end of memory and is now executing whatever is at the start.", 15);
        s.pc = (s.pc + 1) & 15;
      },
    },
    {
      phase: "Fetch", title: "Memory → MDR (data bus)", src: "mem", dst: "mdr", bus: "data", bits: 8,
      val: (s) => s.mem[s.mar], hl: ["mem", "mdr"], memRow: "read",
      text: (s) => `The contents of cell ${s.mar}, ${V(s.mem[s.mar], 8)}, are copied along the <b>data bus</b> into the <b>Memory Data Register</b>. Memory cannot tell whether this is an instruction or data; it is just bits.`,
      apply: (s) => {
        const a = s.mar, v = s.mem[a];
        if (s.written[a]) warn(s, "selfexec" + a, "info", `Cell ${a} was <b>changed by STO</b> before it was fetched. It now runs as <code>${esc(disasm(v))}</code> (self-modifying code).`, a);
        else if (s.intent[a] === "data" && v === 0) warn(s, "emptycell" + a, "warn", `The CPU fetched cell ${a}, which is empty (0). A 0 decodes as <b>HLT</b>, so the machine stops. The program ran off the end of its instructions: it needs an explicit HLT (or a jump).`, a);
        else if (s.intent[a] === "data") warn(s, "execdata" + a, "bad", `The CPU fetched cell ${a} as an instruction, but you stored it as <b>data</b> (${v}). It cannot tell the difference, so it will run those bits as <code>${esc(disasm(v))}</code>. Did the program run past its last instruction, or did a jump land in the wrong place?`, a);
        s.mdr = v; s.kind[a] = "code"; s.memAccess++;
      },
    },
    {
      phase: "Fetch", title: "Copy the MDR into the CIR", src: "mdr", dst: "cir", bus: "int", bits: 8,
      val: (s) => s.mdr, hl: ["mdr", "cir", "cu"],
      text: (s) => `The value in the MDR is copied into the <b>Current Instruction Register</b>. The CPU has now <i>fetched</i> the instruction ${V(s.mdr, 8)}.`,
      apply: (s) => { s.cir = s.mdr; },
    },
  ];

  const DECODE = {
    phase: "Decode", title: "Decode the instruction", src: "cir", dst: "cu", bus: "int", bits: 8,
    val: (s) => s.cir, hl: ["cir", "cu"],
    text: (s) => {
      const d = decode(s.cir);
      const b = bin(s.cir, 8), hi = b.slice(0, 4), lo = b.slice(5);
      if (!d.info) return `The Control Unit splits the CIR into <b>opcode</b> <code>${hi}</code> (${d.op}) and <b>operand</b> <code>${lo}</code> (${d.operand}). Opcode ${d.op} is not defined in this machine, so it cannot be executed.`;
      return `The Control Unit splits the CIR: the top four bits <code>${hi}</code> are the <b>opcode</b> (${d.op} = <b>${d.info.name}</b>), the bottom four bits <code>${lo}</code> are the <b>operand</b> (${d.operand})${d.info.operand ? ", usually a memory address" : ", which this instruction ignores"}. Meaning: ${esc(d.info.summary)}`;
    },
    apply: (s) => { s.decoded = decode(s.cir); },
  };

  function execSteps(s) {
    const d = decode(s.cir);
    const n = d.operand;
    const X = (o) => ({ phase: "Execute", ...o });
    if (!d.info) {
      return [X({ title: "Undefined opcode: CPU faults", src: null, dst: null, bus: "int", hl: ["cu"],
        text: () => `Opcode ${d.op} does not exist, so the Control Unit raises a fault and stops. This is what happens when the PC wanders into <i>data</i> by mistake.`,
        apply: (st) => { st.halted = true; st.fault = true; st.note = "fault: undefined opcode"; warn(st, "fault", "bad", `<b>Fault:</b> opcode ${d.op} (<code>${esc(bin(st.cir, 8))}</code>) is not an instruction. The CPU stopped. Look at the trace to see how the PC arrived at this cell.`, st.fetchAddr); } })];
    }
    const name = d.info.name;
    const usesMem = ["LOAD", "ADD", "SUB", "AND", "OR"].includes(name);
    const opToMar = X({ title: `Operand ${n} → MAR`, src: "cu", dst: "mar", bus: "int", bits: 4, val: () => n, hl: ["cir", "cu", "mar"],
      text: () => `The operand (${V(n, 4)}) from the instruction is placed in the MAR: it says <i>which</i> memory cell the instruction needs.`,
      apply: (st) => { st.mar = n; } });
    const readAddr = X({ title: "Send the address to memory (READ)", src: "mar", dst: "mem", bus: "addr", ctrl: "READ", bits: 4, val: (st) => st.mar, hl: ["mar", "mem", "cu"], memRow: "read",
      text: (st) => `Address ${V(st.mar, 4)} goes along the address bus with a <b>READ</b> signal. This is a <i>second</i> trip to memory for this instruction, an example of the Von Neumann bottleneck.`,
      apply: () => {} });
    const readData = X({ title: "Memory → MDR (data bus)", src: "mem", dst: "mdr", bus: "data", bits: 8, val: (st) => st.mem[st.mar], hl: ["mem", "mdr"], memRow: "read",
      text: (st) => `Cell ${st.mar} holds ${V(st.mem[st.mar], 8)}. It is copied along the data bus into the MDR.`,
      apply: (st) => {
        const a = st.mar;
        if (usesMem && st.intent[a] === "code" && !st.written[a]) warn(st, "readcode" + a, "warn", `<code>${esc(name)} ${a}</code> reads cell ${a}, which holds the <b>instruction</b> <code>${esc(disasm(st.mem[a]))}</code>. Its bits are being used as a number. Is the operand pointing at the wrong cell?`, a);
        if (usesMem && name !== "LOAD" && st.acc == null) warn(st, "emptyacc", "info", `<code>${esc(name)}</code> used the accumulator before any <code>LOAD</code>. ACC was empty, so it was treated as 0.`, null);
        st.mdr = st.mem[a]; st.memAccess++;
      } });
    const toAlu = (opSym, usesA) => X({ title: usesA ? "ACC → ALU A, MDR → ALU B" : "MDR → ALU input B", src: "mdr", dst: "alu", bus: "int", bits: 8, val: (st) => st.mdr, hl: usesA ? ["acc", "mdr", "alu"] : ["mdr", "alu"],
      text: (st) => usesA
        ? `The ALU receives its two operands: <b>A</b> = ACC (${V(st.acc ?? 0, 8)}) and <b>B</b> = MDR (${V(st.mdr, 8)}).`
        : `The value from the MDR (${V(st.mdr, 8)}) is passed into the ALU's B input.`,
      apply: (st) => { st.alu = { a: usesA ? (st.acc ?? 0) : null, b: st.mdr, op: opSym, res: null, zero: null }; } });
    const compute = (fn, verb) => X({ title: `ALU ${verb}; result → ACC`, src: "alu", dst: "acc", bus: "int", bits: 8, val: (st) => fn(st.alu.a, st.alu.b).res, hl: ["alu", "acc"],
      text: (st) => { const r = fn(st.alu.a, st.alu.b); return `The ALU ${verb}: ${r.expr}. ${r.extra}The result goes into the <b>accumulator</b>.`; },
      apply: (st) => {
        const r = fn(st.alu.a, st.alu.b);
        st.alu.res = r.res; st.alu.zero = r.res === 0; st.acc = r.res;
        st.note = `ACC ← ${r.res}${r.wrapped ? " (wrapped)" : ""}`;
        if (r.wrapped) warn(st, "wrap" + st.fetchAddr, "info", `<b>Overflow:</b> ${esc(r.expr)} does not fit in 8 bits, so the accumulator wrapped around to ${r.res}. Real CPUs set a flag here; this program ignored it.`, st.fetchAddr);
      } });

    const arith = {
      PASS: (a, b) => ({ res: b, expr: `passes B (${b}) straight through`, extra: "" }),
      "+": (a, b) => { const t = a + b, r = t & 255; return { res: r, wrapped: t > 255, expr: `${a} + ${b} = ${t}`, extra: t > 255 ? `That does not fit in 8 bits, so it <b>wraps around</b> to ${r}. ` : "" }; },
      "−": (a, b) => { const t = a - b, r = ((t % 256) + 256) % 256; return { res: r, wrapped: t < 0, expr: `${a} − ${b} = ${t}`, extra: t < 0 ? `Negative numbers do not fit, so it <b>wraps around</b> to ${r}. ` : "" }; },
      AND: (a, b) => ({ res: a & b, expr: `${bin(a, 8)} AND ${bin(b, 8)} = ${bin(a & b, 8)}`, extra: "Each result bit is 1 only where both inputs have a 1. " }),
      OR: (a, b) => ({ res: a | b, expr: `${bin(a, 8)} OR ${bin(b, 8)} = ${bin(a | b, 8)}`, extra: "Each result bit is 1 where either input has a 1. " }),
    };

    switch (name) {
      case "LOAD": return [opToMar, readAddr, readData, toAlu("PASS", false), compute(arith.PASS, "passes the value through")];
      case "ADD": return [opToMar, readAddr, readData, toAlu("+", true), compute(arith["+"], "adds")];
      case "SUB": return [opToMar, readAddr, readData, toAlu("−", true), compute(arith["−"], "subtracts")];
      case "AND": return [opToMar, readAddr, readData, toAlu("AND", true), compute(arith.AND, "ANDs the bits")];
      case "OR": return [opToMar, readAddr, readData, toAlu("OR", true), compute(arith.OR, "ORs the bits")];
      case "STO": return [
        opToMar,
        X({ title: "ACC → MDR", src: "acc", dst: "mdr", bus: "int", bits: 8, val: (st) => st.acc ?? 0, hl: ["acc", "mdr"],
          text: (st) => `The accumulator (${V(st.acc ?? 0, 8)}) is copied into the MDR, ready to be written out.`,
          apply: (st) => { st.mdr = st.acc ?? 0; } }),
        X({ title: "MDR → memory (WRITE)", src: "mdr", dst: "mem", bus: "data", ctrl: "WRITE", bits: 8, val: (st) => st.mdr, hl: ["mdr", "mem", "mar", "cu"], memRow: "write",
          text: (st) => `With a <b>WRITE</b> signal on the control bus, the value ${V(st.mdr, 8)} travels along the data bus into the cell chosen by the MAR (cell ${st.mar}).`,
          apply: (st) => {
            const a = st.mar;
            if (st.intent[a] === "code") warn(st, "overwrite" + a, "bad", `<code>STO ${a}</code> <b>overwrote cell ${a}</b>, which held the instruction <code>${esc(disasm(st.mem[a]))}</code>, with ${st.mdr}. If the PC reaches that cell it will not do what you wrote. Check the STO operand.`, a);
            st.mem[a] = st.mdr; st.kind[a] = "data"; st.written[a] = true; st.memAccess++; st.note = `memory[${a}] ← ${st.mdr}`;
          } }),
      ];
      case "JMP": return [X({ title: `Operand ${n} → PC (jump)`, src: "cu", dst: "pc", bus: "int", bits: 4, val: () => n, hl: ["cir", "cu", "pc"],
        text: () => `The operand (${V(n, 4)}) overwrites the PC, so the <i>next</i> fetch comes from cell ${n} instead of the following cell.`,
        apply: (st) => { st.pc = n; st.note = `PC ← ${n}`; } })];
      case "JZ": {
        const test = X({ title: "ALU tests: is ACC zero?", src: "acc", dst: "alu", bus: "int", bits: 8, val: (st) => st.acc ?? 0, hl: ["acc", "alu", "cu"],
          text: (st) => `The ALU checks whether the accumulator (${V(st.acc ?? 0, 8)}) is zero: <b>${(st.acc ?? 0) === 0 ? "yes" : "no"}</b>.`,
          apply: (st) => { st.alu = { a: st.acc ?? 0, b: null, op: "= 0 ?", res: null, zero: (st.acc ?? 0) === 0 }; } });
        return (s.acc ?? 0) === 0
          ? [test, X({ title: `Zero → operand ${n} → PC`, src: "cu", dst: "pc", bus: "int", bits: 4, val: () => n, hl: ["cu", "pc"],
              text: () => `ACC is zero, so the jump is taken: the PC becomes ${n}.`,
              apply: (st) => { st.pc = n; st.note = `ACC = 0, jumped to ${n}`; } })]
          : [test, X({ title: "Not zero → no jump", src: null, dst: null, bus: "int", hl: ["cu", "pc"],
              text: () => `ACC is not zero, so the PC is left alone and execution continues with the next instruction.`,
              apply: (st) => { st.note = "ACC ≠ 0, no jump"; } })];
      }
      case "IN": return [X({ title: "Input device → ACC", src: "in", dst: "acc", bus: "io", bits: 8, val: () => inputVal(), hl: ["in", "acc"],
        text: () => `The number in the Input box (${V(inputVal(), 8)}) is read into the accumulator.`,
        apply: (st) => { st.acc = inputVal(); st.note = `ACC ← ${st.acc} (input)`; } })];
      case "OUT": return [X({ title: "ACC → Output device", src: "acc", dst: "out", bus: "io", bits: 8, val: (st) => st.acc ?? 0, hl: ["acc", "out"],
        text: (st) => `The accumulator (${V(st.acc ?? 0, 8)}) is sent to the Output device.`,
        apply: (st) => { st.out.push(st.acc ?? 0); st.note = `output ${st.acc ?? 0}`; } })];
      default: // HLT
        return [X({ title: "Halt: stop the clock", src: null, dst: null, bus: "int", hl: ["cu"],
          text: () => `<b>HLT</b>: the Control Unit stops. No further instruction is fetched. Press <b>Reset</b> to run again.`,
          apply: (st) => { st.halted = true; st.note = "halted"; } })];
    }
  }

  const stepsFor = (s) => {
    const base = [...FETCH, DECODE];
    return s.stepIdx >= base.length ? base.concat(execSteps(s)) : base;
  };

  /* -------------------------------------------------------------- engine */
  const clone = (o) => (typeof structuredClone === "function" ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
  const machine = $("#machine");
  const chip = $("#chip");

  // Applies one micro-step to state s (no DOM work). Returns the step and its text.
  function stepCore(s) {
    const steps = stepsFor(s);
    const step = steps[s.stepIdx];
    const idx = s.stepIdx;
    const text = step.text(s);
    step.apply(s);
    // Decode (idx = FETCH.length) never ends a cycle: the Execute steps are appended once the opcode is known.
    if ((idx > FETCH.length && idx + 1 >= steps.length) || s.halted) {
      s.cycles++;
      s.log.push({ n: s.cycles, addr: s.fetchAddr, text: disasm(s.cir), note: s.note });
      s.stepIdx = 0;
      if (!s.halted) {
        const sig = s.pc + "|" + s.acc + "|" + s.mem.join(",");
        if (s.seen[sig] != null) {
          warn(s, "loop", "bad", `<b>Endless loop:</b> after instruction ${s.cycles} the machine is in exactly the same state (PC, accumulator and memory) as after instruction ${s.seen[sig]}. Nothing can ever change, so it would repeat forever. Which instruction should have ended the loop?`, null);
          s.loopDetected = true;
        } else s.seen[sig] = s.cycles;
        if (s.cycles >= LIMIT) { s.limitHit = true; warn(s, "limit", "warn", `Stopped after ${LIMIT} instructions. The program may never finish.`, null); }
      }
    } else s.stepIdx = idx + 1;
    s.last = { phase: step.phase, title: step.title, text };
    return step;
  }

  const center = (el) => {
    const m = machine.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - m.left + r.width / 2, y: r.top - m.top + r.height / 2 };
  };
  const nodeEl = (id, memAddr) => {
    if (!id) return null;
    if (id === "mem") return $(`.mem-row[data-addr="${memAddr}"]`) || $('[data-node="mem"]');
    return $(`[data-node="${id}"]`);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const turbo = () => speed() === Infinity;

  async function animate(step, s) {
    const dur = reduceMotion || turbo() ? 0 : 650 / speed();
    const from = nodeEl(step.src, s.mar), to = nodeEl(step.dst, s.mar);
    chip.className = "chip bus-" + step.bus;
    if (!from || !to || from === to || dur === 0) { await sleep(reduceMotion || turbo() ? 0 : 220 / speed()); return; }
    chip.textContent = fmtVal(step.val(s), step.bits || 8);
    const a = center(from), b = center(to);
    chip.style.transition = "none";
    chip.style.left = a.x + "px"; chip.style.top = a.y + "px";
    chip.style.opacity = "1";
    void chip.offsetWidth;
    chip.style.transition = `left ${dur}ms ease-in-out, top ${dur}ms ease-in-out`;
    chip.style.left = b.x + "px"; chip.style.top = b.y + "px";
    await sleep(dur + 40);
    chip.style.opacity = "0";
  }

  function lightUp(step, s) {
    clearLights();
    (step.hl || []).forEach((id) => $$(`[data-node="${id}"]`).forEach((n) => n.classList.add("is-active")));
    if (step.memRow) {
      const row = $(`.mem-row[data-addr="${s.mar}"]`);
      if (row) row.classList.add(step.memRow === "write" ? "is-write" : "is-read");
      $('[data-node="mem"]').classList.add("is-active");
    }
    if (step.bus === "addr") $(".bus-addr-line")?.classList.add("is-on");
    if (step.bus === "data") $(".bus-data-line")?.classList.add("is-on");
    if (step.ctrl) $(".bus-ctrl-line")?.classList.add("is-on");
    const sig = $("#ctrl-signal");
    if (sig) sig.textContent = step.ctrl || "";
  }
  function clearLights() {
    $$(".is-active").forEach((n) => n.classList.remove("is-active"));
    $$(".mem-row.is-read, .mem-row.is-write").forEach((n) => n.classList.remove("is-read", "is-write"));
    $$(".bus.is-on").forEach((n) => n.classList.remove("is-on"));
    const sig = $("#ctrl-signal"); if (sig) sig.textContent = "";
  }

  async function runStep() {
    if (busy || S.halted) return false;
    busy = true;
    const my = epoch;
    history.push(clone(S));
    if (history.length > 400) history.shift();
    const step = stepsFor(S)[S.stepIdx];
    renderControls();
    lightUp(step, S);
    $("#now-title").innerHTML = `<span class="pill ph-${step.phase.toLowerCase()}">${step.phase}</span> ${esc(step.title)}`;
    $("#now-text").innerHTML = step.text(S);
    setPhase(step.phase);
    await animate(step, S);
    if (my !== epoch) return false; // reset while animating
    stepCore(S);
    busy = false;
    render();
    if (S.loopDetected || S.limitHit) abort = true;
    return true;
  }

  async function runUntilBoundary() {
    running = true; abort = false; renderControls();
    const my = epoch;
    do { if (!(await runStep())) break; if (abort) break; await sleep(reduceMotion ? 0 : 120 / (turbo() ? 8 : speed())); }
    while (S.stepIdx !== 0 && !S.halted && !abort && my === epoch);
    if (my === epoch) { running = false; renderControls(); }
  }

  async function runAll() {
    running = true; abort = false; renderControls();
    const my = epoch;
    if (turbo()) {
      history = [];
      let k = 0;
      while (!abort && my === epoch && !S.halted && !S.loopDetected && !S.limitHit) {
        stepCore(S);
        if (++k % 250 === 0) { render(); await sleep(0); }
      }
    } else {
      while (!abort && my === epoch && !S.halted) {
        if (!(await runStep())) break;
        await sleep(reduceMotion ? 0 : 160 / speed());
      }
    }
    if (my === epoch) { running = false; busy = false; render(); }
  }

  function back() {
    if (busy || running || !history.length) return;
    S = history.pop();
    render();
  }

  /* ------------------------------------------------------------ rendering */
  const REGS = { pc: 4, mar: 4, cir: 8, mdr: 8, acc: 8 };
  function setPhase(phase) {
    $$("#phase-pills .pill").forEach((p) => p.classList.toggle("on", p.dataset.phase === phase));
  }

  function renderRegs() {
    for (const [r, bits] of Object.entries(REGS)) {
      $(`#v-${r}`).textContent = fmtVal(S[r], bits);
      $(`#a-${r}`).textContent = altVal(S[r], bits);
    }
    $("#v-cir-asm").textContent = S.cir == null ? "" : disasm(S.cir);
    const a = S.alu;
    $("#alu-a").textContent = a.a == null ? "—" : fmtVal(a.a, 8);
    $("#alu-b").textContent = a.b == null ? "—" : fmtVal(a.b, 8);
    $("#alu-op").textContent = a.op || "—";
    $("#alu-res").textContent = a.res == null ? "—" : fmtVal(a.res, 8);
    $("#alu-zero").textContent = a.zero == null ? "—" : a.zero ? "1 (zero)" : "0";
    const d = S.decoded;
    $("#cu-opcode").textContent = d ? `${bin(d.op, 4)} (${d.info ? d.info.name : "undefined"})` : "—";
    $("#cu-operand").textContent = d ? `${bin(d.operand, 4)} (${d.operand})` : "—";
    $("#cu-cycles").textContent = S.cycles;
  }

  function renderMemory() {
    $$(".mem-row").forEach((row) => {
      const i = Number(row.dataset.addr), v = S.mem[i], isCode = S.kind[i] === "code";
      $(".bits code", row).textContent = bin(v, 8);
      const input = $("input", row);
      if (document.activeElement !== input) input.value = isCode ? disasm(v) : String(v);
      input.disabled = running || busy;
      input.classList.toggle("is-code", isCode);
      $(".ascode", row).textContent = isCode ? "" : "as code: " + disasm(v);
      row.classList.toggle("is-pc", i === S.pc && !S.halted);
      row.classList.toggle("is-mar", i === S.mar);
      row.classList.toggle("has-warn", !!S.warnAddrs[i]);
    });
  }

  function renderSteps() {
    const steps = stepsFor(S);
    const decoded = S.stepIdx > FETCH.length;
    let html = steps.map((st, i) => {
      const cls = i < S.stepIdx ? "done" : i === S.stepIdx && !S.halted ? "next" : "todo";
      return `<li class="${cls}"><span class="pill ph-${st.phase.toLowerCase()}">${st.phase}</span> ${esc(st.title)}</li>`;
    }).join("");
    if (!decoded) html += `<li class="todo muted"><span class="pill ph-execute">Execute</span> depends on the opcode (known after decoding)</li>`;
    $("#steps").innerHTML = html;
    $("#steps-head").textContent = S.halted ? (S.fault ? "The CPU stopped with a fault" : "The CPU has halted") : `Instruction ${S.cycles + 1}: micro-steps`;
  }

  function renderLog() {
    $("#log-body").innerHTML = S.log.slice(-80).reverse().map((l) =>
      `<tr><td>${l.n}</td><td>${l.addr}</td><td><code>${esc(l.text)}</code></td><td>${esc(l.note)}</td></tr>`).join("");
    $("#log-empty").hidden = S.log.length > 0;
    $("#stat-instr").textContent = S.cycles;
    $("#stat-mem").textContent = S.memAccess;
    $("#out-list").innerHTML = S.out.slice(-40).map((v) => `<span class="out-chip">${v}</span>`).join("");
    $("#out-empty").hidden = S.out.length > 0;
  }

  function renderWarnings() {
    const w = S.warnings;
    $("#warn-count").textContent = w.length;
    $("#warn-count").classList.toggle("has", w.some((x) => x.level !== "info"));
    $("#warn-list").innerHTML = w.slice().reverse().map((x) =>
      `<li class="lvl-${x.level}"><span class="wn">Instr. ${x.n}</span><span>${x.text}</span></li>`).join("");
    $("#warn-empty").hidden = w.length > 0;
  }

  function renderExplain() {
    if (S.last) {
      $("#now-title").innerHTML = `<span class="pill ph-${S.last.phase.toLowerCase()}">${S.last.phase}</span> ${esc(S.last.title)}`;
      let extra = "";
      if (S.loopDetected) extra = " <b>Stopped: the machine is in an endless loop (see Bug watch).</b>";
      else if (S.limitHit) extra = ` <b>Stopped after ${LIMIT} instructions.</b>`;
      else if (S.fault) extra = " <b>The CPU has stopped with a fault.</b>";
      else if (S.halted) extra = " <b>The program has finished.</b>";
      $("#now-text").innerHTML = S.last.text + extra;
      setPhase(S.last.phase);
    } else {
      $("#now-title").textContent = "Ready";
      $("#now-text").innerHTML = "Press <b>Step</b> to run one micro-step, <b>Next instruction</b> for a whole fetch–execute cycle, or <b>Run</b> to watch the program play. The PC points at the first instruction.";
      setPhase("");
    }
  }

  function renderControls() {
    const lock = busy || running;
    const done = S.halted || S.loopDetected || S.limitHit;
    $("#btn-step").disabled = lock || done;
    $("#btn-next").disabled = lock || done;
    $("#btn-back").disabled = lock || !history.length;
    $("#btn-run").textContent = running ? "⏸ Pause" : "▶ Run";
    $("#btn-run").disabled = (busy && !running) || done;
    $("#start-pc").disabled = lock;
    $("#preset").disabled = lock;
    $$(".edit-tools button").forEach((b) => (b.disabled = lock));
  }

  function render() {
    renderRegs(); renderMemory(); renderSteps(); renderLog(); renderWarnings(); renderExplain(); renderControls();
    if (!busy) clearLights();
    layoutBuses();
  }

  /* --------------------------------------------------------------- buses */
  function layoutBuses() {
    const svg = $("#bus-layer");
    const cpu = $(".cpu"), mem = $('[data-node="mem"]');
    if (!svg || !cpu || !mem) return;
    const m = machine.getBoundingClientRect(), c = cpu.getBoundingClientRect(), r = mem.getBoundingClientRect();
    if (!m.width) return;
    const on = (cls) => (svg.querySelector("." + cls)?.classList.contains("is-on") ? " is-on" : "");
    const keep = { a: on("bus-addr-line"), d: on("bus-data-line"), c: on("bus-ctrl-line") };
    const sigText = $("#ctrl-signal")?.textContent || "";
    const x1 = c.right - m.left, x2 = r.left - m.left;
    const yOf = (id) => center($(`[data-node="${id}"]`)).y;
    const buses = [
      { cls: "bus-addr-line" + keep.a, y: yOf("mar"), label: "ADDRESS BUS" },
      { cls: "bus-data-line" + keep.d, y: yOf("mdr"), label: "DATA BUS" },
      { cls: "bus-ctrl-line" + keep.c, y: yOf("cu"), label: "CONTROL BUS" },
    ];
    svg.setAttribute("width", m.width); svg.setAttribute("height", m.height);
    svg.innerHTML = buses.map((b) => `
      <g class="bus ${b.cls}">
        <line x1="${x1}" y1="${b.y}" x2="${x2}" y2="${b.y}" />
        <text x="${(x1 + x2) / 2}" y="${b.y - 7}" text-anchor="middle">${b.label}</text>
        ${b.cls.startsWith("bus-ctrl-line") ? `<text id="ctrl-signal" x="${(x1 + x2) / 2}" y="${b.y + 17}" text-anchor="middle" class="sig">${sigText}</text>` : ""}
      </g>`).join("");
  }

  /* ------------------------------------------------- import / export / chaos */
  function exportText() {
    const lines = ["; Fetch-Execute simulator program", `start ${initial.pc}`];
    initial.mem.forEach((v, i) => {
      if (initial.kind[i] === "code") lines.push(`${i}: ${disasm(v)}`);
      else if (v !== 0) lines.push(`${i}: ${v}`);
    });
    return lines.join("\n");
  }
  function importText(text) {
    const mem = Array(16).fill(0), kind = Array(16).fill("data");
    let pc = 0; const errors = [];
    text.split(/\r?\n/).forEach((raw, ln) => {
      const line = raw.replace(/[;#].*$/, "").trim();
      if (!line) return;
      let m = line.match(/^start\s+(\d{1,2})$/i);
      if (m) { pc = Math.min(15, Number(m[1])); return; }
      m = line.match(/^(\d{1,2})\s*[:\s]\s*(.+)$/);
      const a = m ? Number(m[1]) : -1;
      const p = m ? parseCell(m[2]) : null;
      if (!m || a > 15 || !p) { errors.push(ln + 1); return; }
      mem[a] = p.value; kind[a] = p.kind;
    });
    if (errors.length) return `Could not read line${errors.length > 1 ? "s" : ""} ${errors.join(", ")}. Use "address: instruction or number", e.g. 0: LOAD 8`;
    setInitial(mem, kind, pc);
    currentPreset = "blank";
    $("#preset-desc").textContent = "Your own program, loaded from the text box.";
    $("#spoiler").hidden = true;
    return "";
  }

  /* -------------------------------------------------------------- wiring */
  function buildMemoryRows() {
    $("#mem-body").innerHTML = Array.from({ length: 16 }, (_, i) => `
      <tr class="mem-row" data-addr="${i}">
        <td class="ptr" aria-hidden="true"></td>
        <td class="addr"><code>${i.toString(2).padStart(4, "0")}</code><small>${i}</small></td>
        <td class="bits"><code></code></td>
        <td><input type="text" autocomplete="off" spellcheck="false" aria-label="Cell ${i}: instruction or number" /></td>
        <td class="ascode"></td>
      </tr>`).join("");
    $$(".mem-row").forEach((row) => {
      const i = Number(row.dataset.addr), input = $("input", row);
      const commit = () => {
        const p = parseCell(input.value);
        if (!p) { input.classList.add("bad"); setTimeout(() => input.classList.remove("bad"), 900); renderMemory(); return; }
        S.mem[i] = p.value; S.kind[i] = p.kind; S.intent[i] = p.kind;
        initial.mem[i] = p.value; initial.kind[i] = p.kind;
        history = [];
        render();
      };
      input.addEventListener("change", commit);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
    });
  }

  function buildIsaTable() {
    $("#isa-body").innerHTML = OPS.map((o) => `
      <tr><td><code>${o.code.toString(2).padStart(4, "0")}</code> <small>(${o.code})</small></td>
      <td><b>${o.name}</b>${o.operand ? " <i>addr</i>" : ""}</td>
      <td><code>${esc(o.summary)}</code></td><td>${esc(o.detail)}</td></tr>`).join("");
  }

  function init() {
    buildMemoryRows();
    buildIsaTable();
    const groups = {};
    Object.entries(PRESETS).forEach(([k, p]) => (groups[p.group] = (groups[p.group] || []).concat([[k, p]])));
    $("#preset").innerHTML = Object.entries(groups).map(([g, items]) =>
      `<optgroup label="${esc(g)}">${items.map(([k, p]) => `<option value="${k}">${esc(p.label)}</option>`).join("")}</optgroup>`).join("");

    $("#preset").addEventListener("change", (e) => { loadPreset(e.target.value); render(); });
    $("#btn-restore").addEventListener("click", () => { loadPreset(currentPreset); $("#preset").value = currentPreset in PRESETS ? currentPreset : "blank"; render(); });
    $("#btn-reset").addEventListener("click", () => { resetCpu(); $("#out-list").innerHTML = ""; render(); });
    $("#btn-step").addEventListener("click", () => runStep());
    $("#btn-next").addEventListener("click", () => runUntilBoundary());
    $("#btn-back").addEventListener("click", back);
    $("#btn-run").addEventListener("click", () => { if (running) abort = true; else runAll(); });
    $("#speed").addEventListener("input", (e) => {
      speedIdx = Number(e.target.value);
      $("#speed-label").textContent = turbo() ? "Max" : speed() + "×";
    });
    $("#start-pc").addEventListener("change", (e) => {
      const v = Math.max(0, Math.min(15, Math.round(Number(e.target.value) || 0)));
      e.target.value = v; initial.pc = v; S.pc = v; history = []; render();
    });
    $$('input[name="notation"]').forEach((r) => r.addEventListener("change", () => { if (r.checked) { notation = r.value; render(); } }));

    $("#btn-chaos").addEventListener("click", () => {
      const mem = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
      setInitial(mem, Array(16).fill("data"), 0);
      $("#preset-desc").textContent = "Random bytes in every cell. The CPU will happily try to execute them. Press Run and watch the bug watch.";
      $("#spoiler").hidden = true;
      render();
    });
    $("#btn-clear").addEventListener("click", () => { $("#preset").value = "blank"; loadPreset("blank"); render(); });
    $("#btn-export").addEventListener("click", () => { $("#port-text").value = exportText(); $("#port-msg").textContent = "Current memory exported. Copy it to share or save."; });
    $("#btn-copy").addEventListener("click", async () => {
      const t = $("#port-text").value || exportText();
      $("#port-text").value = t;
      try { await navigator.clipboard.writeText(t); $("#port-msg").textContent = "Copied to the clipboard."; }
      catch { $("#port-text").select(); $("#port-msg").textContent = "Press Ctrl+C to copy."; }
    });
    $("#btn-import").addEventListener("click", () => {
      const err = importText($("#port-text").value);
      $("#port-msg").textContent = err || "Program loaded.";
      if (!err) { $("#preset").value = "blank"; render(); }
    });

    window.addEventListener("resize", layoutBuses);
    if ("ResizeObserver" in window) new ResizeObserver(layoutBuses).observe(machine);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutBuses);

    loadPreset("deck");
    $("#preset").value = "deck";
    render();
  }

  window.__fe = { get state() { return S; }, stepCore, parseCell, disasm, loadPreset, importText, exportText, PRESETS, render };
  init();
})();
