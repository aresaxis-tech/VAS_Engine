import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// Cache the data in memory to avoid reading disk on every request
// This is safe for a 18MB file in a serverless function warm start
let pincodeCache: any[] | null = null;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query || query.length < 3) {
            return NextResponse.json({ error: 'Query must be at least 3 characters' }, { status: 400 });
        }

        const lowerQuery = query.toLowerCase().trim();

        // Load data if not in cache
        if (!pincodeCache) {
            const filePath = path.join(process.cwd(), 'src', 'data', 'india-pincodes.json');
            try {
                const fileContents = await fs.readFile(filePath, 'utf-8');
                pincodeCache = JSON.parse(fileContents);
            } catch (error) {
                console.error("Error reading pincode file:", error);
                return NextResponse.json({ error: 'Failed to load pincode data' }, { status: 500 });
            }
        }

        if (!pincodeCache) {
            return NextResponse.json({ results: [] });
        }

        // Filter results
        // Source JSON keys: officeName, pincode, taluk, districtName, stateName
        const results = pincodeCache
            .filter((item: any) => {
                const pCode = String(item.pincode);
                const office = item.officeName?.toLowerCase() || '';
                const district = item.districtName?.toLowerCase() || '';

                return pCode.startsWith(lowerQuery) ||
                    office.includes(lowerQuery) ||
                    district.includes(lowerQuery);
            })
            .slice(0, 10) // Limit results
            .map((item: any) => ({
                pincode: String(item.pincode),
                city: item.districtName, // Mapping district to City for UI consistency
                state: item.stateName,
                area: `${item.officeName}, ${item.taluk}`,
                region: "" // Data doesn't have region, can leave empty or derive
            }));

        return NextResponse.json({ results });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
