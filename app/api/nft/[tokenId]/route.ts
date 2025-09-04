import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  const { tokenId } = await params;

  try {
    const res = await fetch(
      `https://diydriller-bucket.s3.ap-northeast-2.amazonaws.com/nft/${tokenId}`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Metadata not found", status: 404 });
    }

    const json = await res.json();

    return NextResponse.json(json);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error", status: 500 });
  }
}
