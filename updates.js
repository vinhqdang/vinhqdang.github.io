// Add new items to the top of this list.
window.siteUpdates = [
  {
    date: "November 2026",
    type: "Publication",
    title: "New paper at ICONIP 2026 on local LLMs for log anomaly detection",
    summary:
      "\"Local LLM-Guided Counterfactual Augmentation for Low-Label Log Anomaly Detection\" (led by Dat Le, with Anh Vu Le, Sutharshan Rajasegarar, Thanh Thi Nguyen, Minh Ngoc Dinh, Maia Angelova, Wei Luo, Thach Ngo and me) appears in the proceedings of ICONIP 2026 (Springer CCIS, CORE rank B). A local language model is used only offline, to rewrite training log windows into label-changing variants such as a failure becoming a recovery; the deployed detector stays a light TF-IDF classifier with no LLM calls. On a fixed HDFS split this helped in the low-label setting for one generator configuration, while the gains were smaller elsewhere and BGL and Thunderbird were already near ceiling. The paper presents this as feasibility evidence, not a scaling claim.",
    href: "https://doi.org/10.1007/978-981-92-8230-2_34",
    cta: "Read the paper",
    featured: true
  },
  {
    date: "November 2026",
    type: "Publication",
    title: "New paper in Technological Sustainability on AI for environmental governance",
    summary:
      "\"From compliance to resilience: a functional framework for AI-enabled environmental governance\" is out in Technological Sustainability (Emerald). The paper asks what really counts as AI in corporate environmental governance, and why so much of it only automates compliance reporting. It proposes a four-layer framework (sensing, decision, institutional, equity) and argues that buying sensing tools without building the decision and institutional layers yields compliance, not resilience, especially for SMEs in middle-income economies. The journal is at the 80th Scopus percentile (Q1) and SCImago Q2.",
    href: "https://doi.org/10.1108/TECHS-08-2026-0184",
    cta: "Read the paper",
    featured: true
  },
  {
    date: "November 2026",
    type: "Publication",
    title: "New paper at FDSE 2026 on object hallucination in vision-language models, with two first-year students",
    summary:
      "\"Unraveling Object Hallucination in Vision-Language Models: From Scene Complexity to Visual Grounding\" (with Phuong Lan Nguyen and Hoang Viet Vu, who were first-year undergraduates when they did this work) appears in the FDSE 2026 proceedings (Springer CCIS). Do cluttered scenes make a vision-language model invent objects? On LLaVA-1.5-7B and MS COCO, we find the link between visual complexity and hallucination is weak and even changes direction with the complexity measure, and removing image content helps only when the removal is small. What predicts hallucination best is how well each mentioned object is grounded in the image: a lightweight detector reaches a ROC-AUC of 0.85 mostly from grounding features.",
    href: "https://doi.org/10.1007/978-981-92-8107-7_7",
    cta: "Read the paper",
    featured: true
  },
  {
    date: "November 2026",
    type: "Publication",
    title: "New paper in the International Journal of Machine Learning and Cybernetics: fuzzy-conformal graph neural networks",
    summary:
      "\"Fuzzy-conformal graph neural networks with distribution-free coverage guarantees for cybersecurity anomaly detection\" is now published in the International Journal of Machine Learning and Cybernetics (Springer). It joins fuzzy rule-based message passing with a community-wise conformal calibration, so that each alert comes with a set of candidate attack classes, a coverage guarantee conditional on the region of the network, and readable IF-THEN rules. It is evaluated on seven public cybersecurity benchmarks. The journal is SCIE-indexed, SCImago Q2, and at the 74th Scopus percentile.",
    href: "https://doi.org/10.1007/s13042-026-03371-3",
    cta: "Read the paper",
    featured: true
  },
  {
    date: "November 2026",
    type: "Publication",
    title: "Paper on green credit policy and FinTech accepted in FinTech and Sustainable Innovation",
    summary:
      "\"Screening Green from Grey: FinTech Infrastructure and the Threshold Effectiveness of Green Credit Policy\" has been accepted for publication in FinTech and Sustainable Innovation (Bon View Publishing). The paper asks when green credit policy actually separates green from polluting borrowers, and how the strength of a region's FinTech infrastructure shapes that effect.",
    href: "https://ojs.bonviewpress.com/index.php/FSI",
    cta: "About the journal",
    featured: true
  },
  {
    date: "November 2026",
    type: "Publication",
    title: "VOUCH accepted in Machine Learning (Springer)",
    summary:
      "\"VOUCH: Anytime-Valid Certificates for Machine Unlearning via Paired-Canary Hypothesis-Betting\" is accepted in Machine Learning. It plants paired ghost canaries before training and uses betting statistics that stay valid however long an auditor watches. An interactive, in-browser explainer walks through the algorithm.",
    href: "./vouch_explained.html",
    cta: "Open the explainer",
    featured: true
  },
  {
    date: "July 2026",
    type: "Publication",
    title: "New paper on work-integrated learning in Vietnamese higher education",
    summary:
      "\"Work-integrated learning in Vietnamese higher education: governance models, institutional diversity and graduate employability in the Asian century\" (with Thi-Hong-Hanh Nguyen) is out in Higher Education, Skills and Work-based Learning (Emerald). A comparative case study across six Vietnamese universities identifying five distinct WIL governance models.",
    href: "https://doi.org/10.1108/HESWBL-05-2026-0390",
    cta: "Read the paper",
    featured: true
  },
  {
    date: "July 2026",
    type: "Publication",
    title: "New paper on explainable graph neural networks for social bot detection",
    summary:
      "\"XHBot: eXplainable Heterophily-aware Graph Neural Networks for Social Bot Detection\" (with Phuong-Lan Nguyen, Dat Le, and Minh Ngoc Dinh) appears in EAI Endorsed Transactions on AI and Robotics. XHBot reaches an F1 of 0.9474 on TwiBot-20, improving over recent baselines by 9.64%, with a forensic explanation module for platform moderation.",
    href: "https://doi.org/10.4108/airo.12969",
    cta: "Read the paper",
    featured: true
  },
  {
    date: "May 2026",
    type: "Publication",
    title: "New paper at IndabaX Nigeria 2026, published in PMLR",
    summary:
      "\"FedFairGNN: A Privacy-Preserving and Fairness-Aware Federated Graph Neural Network for Fraud Detection\" (with Ngoc-Son-An Nguyen) appears in Proceedings of Machine Learning Research, volume 319, pages 74-86, from IndabaX Nigeria 2026 at the University of Ibadan. PMLR is Scopus-indexed, with roughly 92% of its volumes covered.",
    href: "https://proceedings.mlr.press/v319/dang26a.html",
    cta: "Read the paper",
    featured: true
  },
  {
    date: "April 2026",
    type: "Publication",
    title: "New paper in SN Computer Science on uncertainty-aware intrusion detection",
    summary:
      "\"Utilizing Uncertainty Measures to Improve the Performance of Intrusion Detection Systems\" is out in SN Computer Science. It combines nine SPROUT uncertainty measures with distance-based metrics and Isolation Forest to cut false negative rates for minority attack classes by up to 50% on CICIDS 2017 while keeping accuracy above 98%.",
    href: "https://doi.org/10.1007/s42979-026-04923-8",
    cta: "Read the paper",
    featured: true
  },
  {
    date: "March 2026",
    type: "Research",
    title: "Research profile passes 900 citations and 60+ Scopus-indexed publications",
    summary:
      "A current milestone across the publication and citation record, reflecting continued work in AI, cyber security, and trustworthy data systems.",
    href: "https://scholar.google.com/citations?hl=en&user=oLXKzkQAAAAJ&view_op=list_works&sortby=pubdate",
    cta: "View Scholar profile",
    featured: true
  },
  {
    date: "March 2026",
    type: "Site",
    title: "Personal website launched",
    summary:
      "This site now has a dedicated updates area so new talks, publications, awards, media mentions, and teaching milestones can be shared in one place.",
    href: "./updates.html",
    cta: "Browse all updates",
    featured: false
  },
  {
    date: "April 2025",
    type: "Talk",
    title: "Shared expert perspectives on data strategy and biometrics in banking",
    summary:
      "Spoke at the World Financial Innovation Series 2025 on building data culture for banking and the implications of biometric evolution for user experience.",
    href: "https://www.buv.edu.vn/research/",
    cta: "Read BUV coverage",
    featured: true
  }
];
