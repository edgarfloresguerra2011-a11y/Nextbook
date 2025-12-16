
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    return NextResponse.json({ message: "API Reachable via GET", id: params.id });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    console.log("DEBUG: POST REACHED for ID:", params.id);
    return NextResponse.json({ message: "API Reachable via POST", id: params.id });
}
