from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
d=Document('ref0.docx')
sec=d.sections[0]; sec.page_width=Cm(21); sec.page_height=Cm(29.7)
for m in ('left_margin','right_margin','top_margin','bottom_margin'): setattr(sec,m,Cm(2))
def fix(st,size=12,bold=None,italic=None,align=None,before=0,after=6,color=True):
    f=st.font; f.name='Times New Roman'; f.size=Pt(size)
    rpr=st.element.get_or_add_rPr(); rf=rpr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rFonts')
    if rf is None: rf=rpr.makeelement('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rFonts',{}); rpr.append(rf)
    for a in ('ascii','hAnsi','cs','eastAsia'): rf.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'+a,'Times New Roman')
    for a in ('asciiTheme','hAnsiTheme','cstheme','eastAsiaTheme'): rf.attrib.pop('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'+a,None)
    if bold is not None: f.bold=bold
    if italic is not None: f.italic=italic
    if color: f.color.rgb=RGBColor(0,0,0)
    pf=st.paragraph_format; pf.line_spacing=1.0; pf.space_before=Pt(before); pf.space_after=Pt(after)
    if align is not None: pf.alignment=align
S0=d.styles
class _S(dict):
  pass
S=_S({st.name:st for st in S0})
S.add_style=S0.add_style
J=WD_ALIGN_PARAGRAPH.JUSTIFY; C=WD_ALIGN_PARAGRAPH.CENTER; L=WD_ALIGN_PARAGRAPH.LEFT
for n in ['Normal','Body Text','First Paragraph','Compact']:
    if n in S: fix(S[n],align=J)
for n,lv in [('Heading 1',1),('Heading 2',2),('Heading 3',3)]:
    fix(S[n],bold=True,italic=False,align=L,before=12 if lv==1 else 8,after=6)
for n in ['Image Caption','Table Caption','Caption']:
    if n in S: fix(S[n],size=11,italic=False,align=J,before=4,after=10)
for n in ['Bibliography']:
    if n in S: fix(S[n],align=J,after=4)
def new(n,**kw):
    st=S.add_style(n,WD_STYLE_TYPE.PARAGRAPH); st.base_style=S['Normal']; fix(st,**kw)
new('PaperTitle',size=14,bold=True,align=C,after=12)
new('PaperAuthors',bold=True,align=C,after=6)
new('PaperAffil',italic=True,align=C,after=6)
new('PaperCorr',align=L,after=12)
new('AbstractHead',bold=True,align=L,after=6)
new('AbstractBody',align=J,after=6)
new('Keywords',align=J,italic=True,after=12)
d.save('reference.docx')
