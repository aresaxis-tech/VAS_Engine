// Pincode Master Data (Expanded for Hackathon)
// Real implementation would use a larger DB or API

export interface PincodeData {
    pincode: string;
    city: string;
    state: string;
    area: string;
    region: string;
}

const PINCODE_MASTER_LIST: PincodeData[] = [
    // --- MAHARASHTRA ---
    { pincode: "400001", city: "Mumbai", state: "Maharashtra", area: "Fort / GPO", region: "West" },
    { pincode: "400021", city: "Mumbai", state: "Maharashtra", area: "Nariman Point", region: "West" },
    { pincode: "400051", city: "Mumbai", state: "Maharashtra", area: "Bandra East", region: "West" },
    { pincode: "400050", city: "Mumbai", state: "Maharashtra", area: "Bandra West", region: "West" },
    { pincode: "400093", city: "Mumbai", state: "Maharashtra", area: "Andheri East", region: "West" },
    { pincode: "400053", city: "Mumbai", state: "Maharashtra", area: "Andheri West", region: "West" },
    { pincode: "400072", city: "Mumbai", state: "Maharashtra", area: "Powai", region: "West" },
    { pincode: "400703", city: "Navi Mumbai", state: "Maharashtra", area: "Vashi", region: "West" },
    { pincode: "400701", city: "Navi Mumbai", state: "Maharashtra", area: "Ghansoli", region: "West" },
    { pincode: "400614", city: "Navi Mumbai", state: "Maharashtra", area: "CBD Belapur", region: "West" },
    { pincode: "411001", city: "Pune", state: "Maharashtra", area: "Pune City", region: "West" },
    { pincode: "411057", city: "Pune", state: "Maharashtra", area: "Hinjewadi", region: "West" },
    { pincode: "411028", city: "Pune", state: "Maharashtra", area: "Hadapsar", region: "West" },
    { pincode: "410203", city: "Khopoli", state: "Maharashtra", area: "Khopoli Industrial Estate", region: "West" },
    { pincode: "410206", city: "Raigad", state: "Maharashtra", area: "Panvel", region: "West" },
    { pincode: "410210", city: "Navi Mumbai", state: "Maharashtra", area: "Kharghar", region: "West" },
    { pincode: "440001", city: "Nagpur", state: "Maharashtra", area: "Civil Lines", region: "West" },
    { pincode: "422001", city: "Nashik", state: "Maharashtra", area: "Panchavati", region: "West" },

    // --- DELHI NCR ---
    { pincode: "110001", city: "New Delhi", state: "Delhi", area: "Connaught Place", region: "North" },
    { pincode: "110019", city: "New Delhi", state: "Delhi", area: "Nehru Place", region: "North" },
    { pincode: "110020", city: "New Delhi", state: "Delhi", area: "Okhla Industrial Area", region: "North" },
    { pincode: "110037", city: "New Delhi", state: "Delhi", area: "Mahipalpur (Airport)", region: "North" },
    { pincode: "122001", city: "Gurugram", state: "Haryana", area: "Cyber City", region: "North" },
    { pincode: "122002", city: "Gurugram", state: "Haryana", area: "DLF Phase 1", region: "North" },
    { pincode: "122018", city: "Gurugram", state: "Haryana", area: "Udyog Vihar", region: "North" },
    { pincode: "201301", city: "Noida", state: "Uttar Pradesh", area: "Sector 1 / 15", region: "North" },
    { pincode: "201309", city: "Noida", state: "Uttar Pradesh", area: "Sector 62", region: "North" },

    // --- KARNATAKA ---
    { pincode: "560001", city: "Bengaluru", state: "Karnataka", area: "MG Road", region: "South" },
    { pincode: "560100", city: "Bengaluru", state: "Karnataka", area: "Electronic City Ph1", region: "South" },
    { pincode: "560103", city: "Bengaluru", state: "Karnataka", area: "Bellandur (ORR)", region: "South" },
    { pincode: "560066", city: "Bengaluru", state: "Karnataka", area: "Whitefield", region: "South" },
    { pincode: "560034", city: "Bengaluru", state: "Karnataka", area: "Koramangala", region: "South" },
    { pincode: "560078", city: "Bengaluru", state: "Karnataka", area: "JP Nagar", region: "South" },
    { pincode: "570001", city: "Mysuru", state: "Karnataka", area: "Mysore City", region: "South" },

    // --- TELANGANA / AP ---
    { pincode: "500081", city: "Hyderabad", state: "Telangana", area: "HITEC City", region: "South" },
    { pincode: "500032", city: "Hyderabad", state: "Telangana", area: "Gachibowli", region: "South" },
    { pincode: "500033", city: "Hyderabad", state: "Telangana", area: "Banjara Hills", region: "South" },
    { pincode: "530001", city: "Visakhapatnam", state: "Andhra Pradesh", area: "Port Area", region: "South" },

    // --- TAMIL NADU ---
    { pincode: "600001", city: "Chennai", state: "Tamil Nadu", area: "George Town", region: "South" },
    { pincode: "600096", city: "Chennai", state: "Tamil Nadu", area: "Perungudi (OMR)", region: "South" },
    { pincode: "600032", city: "Chennai", state: "Tamil Nadu", area: "Guindy Industrial Area", region: "South" },
    { pincode: "600113", city: "Chennai", state: "Tamil Nadu", area: "Taramani (Tidel Park)", region: "South" },
    { pincode: "641001", city: "Coimbatore", state: "Tamil Nadu", area: "Town Hall", region: "South" },

    // --- GUJARAT ---
    { pincode: "380001", city: "Ahmedabad", state: "Gujarat", area: "Lal Darwaja", region: "West" },
    { pincode: "380015", city: "Ahmedabad", state: "Gujarat", area: "Satellite Area", region: "West" },
    { pincode: "382330", city: "Ahmedabad", state: "Gujarat", area: "Naroda GIDC", region: "West" },
    { pincode: "395001", city: "Surat", state: "Gujarat", area: "Nanpura", region: "West" },
    { pincode: "395002", city: "Surat", state: "Gujarat", area: "Textile Market", region: "West" },
    { pincode: "390001", city: "Vadodara", state: "Gujarat", area: "Baroda City", region: "West" },

    // --- WEST BENGAL ---
    { pincode: "700001", city: "Kolkata", state: "West Bengal", area: "Dalhousie", region: "East" },
    { pincode: "700091", city: "Kolkata", state: "West Bengal", area: "Salt Lake Sec 5", region: "East" },
    { pincode: "700156", city: "Kolkata", state: "West Bengal", area: "New Town", region: "East" },

    // --- OTHERS ---
    { pincode: "302001", city: "Jaipur", state: "Rajasthan", area: "Pink City", region: "North" },
    { pincode: "226001", city: "Lucknow", state: "Uttar Pradesh", area: "Hazratganj", region: "North" },
    { pincode: "452001", city: "Indore", state: "Madhya Pradesh", area: "Sanyogitaganj", region: "Central" },
    { pincode: "160017", city: "Chandigarh", state: "Chandigarh", area: "Sector 17", region: "North" },
    { pincode: "682001", city: "Kochi", state: "Kerala", area: "Marine Drive", region: "South" },
    { pincode: "403001", city: "Panaji", state: "Goa", area: "Panjim", region: "West" }
];

export function searchPincode(query: string): PincodeData[] {
    if (!query || query.trim().length < 3) return [];

    const lowerQ = query.toLowerCase().trim();

    return PINCODE_MASTER_LIST.filter(item =>
        item.pincode.startsWith(lowerQ) || // Pincode starts with query
        item.city.toLowerCase().startsWith(lowerQ) || // City starts with query
        item.area.toLowerCase().includes(lowerQ) || // Area matches
        item.state.toLowerCase().startsWith(lowerQ) // State matches
    ).slice(0, 8); // Expanded limit to 8
}
