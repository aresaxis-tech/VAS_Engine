
export const VAS_CATALOG = {
    CYBER: [
        { id: "cyber_agentless", name: "Agentless Patching", desc: "Automated vulnerability remediation without agent overhead." },
        { id: "cyber_os", name: "All-in-one Operating System", desc: "Unified secure OS environment." },
        { id: "cyber_awareness", name: "Awareness Campaigns", desc: "Employee training against phishing and social engineering." },
        { id: "cyber_cxo", name: "CXO Session", desc: "Strategic risk briefing for executive leadership." },
        { id: "cyber_dashboard", name: "Cyber Risk & Compliance Dashboard", desc: "Real-time visualization of security posture." },
        { id: "cyber_dpdp", name: "DPDP Consulting", desc: "Data Protection & Privacy compliance advisory." },
        { id: "cyber_edr", name: "EDR/MDR", desc: "Endpoint Detection & Response (Managed)." },
        { id: "cyber_email", name: "Email Security", desc: "Advanced protection against BEC and spam." },
        { id: "cyber_ir", name: "Incident Response & Readiness", desc: "On-call forensic squad for breach scenarios." },
        { id: "cyber_phishing", name: "Phishing Simulation", desc: "Controlled tests to vulnerability assessment." },
        { id: "cyber_scorecard", name: "Security Score Card", desc: "External rating of cyber hygiene." },
        { id: "cyber_vapt", name: "VAPT", desc: "Vulnerability Assessment & Penetration Testing." },
        { id: "cyber_intel", name: "Weekly Threat Intelligence", desc: "Curated sector-specific threat bulletins." }
    ],
    ENGINEERING: [
        { id: "eng_cpm", name: "CPM VAS", desc: "Critical Path Method project monitoring." },
        { id: "eng_drone", name: "Drone Assessment", desc: "Aerial survey for large-scale engineering sites." },
        { id: "eng_elp", name: "ELP", desc: "Early Loss Prevention / Engineering Loss Profiling." }
    ],
    MARINE: [
        { id: "mar_logistics", name: "Logistics Operations Tech", desc: "IoT tracking for cargo fleets." },
        { id: "mar_risk", name: "Logistic Risk Management", desc: "End-to-end supply chain risk quantification." },
        { id: "mar_mlce", name: "MLCE", desc: "Marine Loss Control Engineering." },
        { id: "mar_warranty", name: "Marine Warranty Survey", desc: "Project Cargo / PDI inspection." },
        { id: "mar_ocean", name: "Ocean Operations Tech", desc: "Deep-sea monitoring solutions." }
    ],
    PROPERTY: [
        { id: "prop_val", name: "Asset Valuation", desc: "Precise market value assessment of fixed assets." },
        { id: "prop_cra", name: "CRA", desc: "Comprehensive Risk Assessment." },
        { id: "prop_solar", name: "Drone Thermo-Solar Plant", desc: "Thermal imaging for solar farm efficiency/safety." },
        { id: "prop_wind", name: "Drone Thermo-Wind Plant", desc: "Thermal inspection for wind turbine nacelles." },
        { id: "prop_energy", name: "Energy Audit Quote", desc: "Optimization of power consumption and safety." },
        { id: "prop_era", name: "ERA", desc: "Engineering Risk Assessment." },
        { id: "prop_fe", name: "FE", desc: "Fire Engineering / Safety Audit." },
        { id: "prop_fireball", name: "Fire Ball", desc: "Auto-activating fire suppression device." }
    ]
};

// Helper to get random VAS from a category
export const getRecommendedVAS = (category: keyof typeof VAS_CATALOG, count: number = 2) => {
    const list = VAS_CATALOG[category];
    if (!list) return [];
    // Shuffle and pick
    return list.sort(() => 0.5 - Math.random()).slice(0, count);
};
