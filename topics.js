// Research themes. Each publication can belong to several themes; tags are derived from the title.
window.siteTopics = [
  { id: "security", label: "Cyber Security & Intrusion Detection",
    blurb: "Machine learning to detect intrusions, malware and spam in IoT, SDN and WiFi environments.",
    re: /intrusion|malware|attack|botnet|\bdns\b|spam|cyber|vulnerab|\bsdn\b|software-defined|bot detection|obfuscat/i },
  { id: "graph", label: "Graph Learning",
    blurb: "Graph neural networks, community detection and link prediction for fraud, bots and malware.",
    re: /graph|louvain|\blinks?\b|link-|signed|community|random walk/i },
  { id: "privacy", label: "Privacy & Federated Learning",
    blurb: "Federated, Byzantine-robust and privacy-preserving learning, and certifying machine unlearning.",
    re: /federated|privacy|unlearn|forgotten|byzantine|fedfair|fedxids/i },
  { id: "explain", label: "Explainable & Reliable ML",
    blurb: "Explainability, uncertainty, fairness and conformal methods for models people can trust in operation.",
    re: /explain|uncertain|conformal|confide|fairness|robust|understanding the decision/i },
  { id: "llm", label: "LLMs & Retrieval",
    blurb: "Retrieval-augmented generation, transformers and multi-agent LLMs for search, finance and security.",
    re: /\bllms?\b|\brag\b|finrag|retrieval-augmented|retrieval augmented|transformer|multi-agent/i },
  { id: "trust", label: "Trust & Collaborative Systems",
    blurb: "Computational trust, Wikipedia quality assessment and social recommendation (doctoral work at Inria).",
    re: /\btrust|wikipedia|collaboratively|collaborative (systems|editors)|social recommendation|cooperative/i },
  { id: "finance", label: "Finance & Fraud",
    blurb: "Fraud detection, financial documents, trading and portfolio decision-making.",
    re: /stock|portfolio|financ|fraud|trading|banking|e-commerce/i },
  { id: "education", label: "AI in Education",
    blurb: "Work-integrated learning, assistive AI and equity in higher education and school outreach.",
    re: /education|student|hackathon|equity|disabled/i }
];

window.topicsOf = function (pub) {
  return window.siteTopics.filter((t) => t.re.test(pub.title)).map((t) => t.id);
};
