import { NextRequest, NextResponse } from 'next/server';

interface TokenMarqueeRawData {
    tokenName: string;
    priceUsd: number;
    liquidity: number;
    marketCap: number;
    priceChange_h1: number;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tokenAddress = searchParams.get('address');

    if (!tokenAddress) {
        return NextResponse.json({ message: 'Address required' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        if (!response.ok) {
            console.error('DexScreener API request failed:', response.statusText);
            return NextResponse.json({ message: 'External API Error' }, { status: 502 });
        }
        const data = await response.json();
        if (!data.pairs || data.pairs.length === 0) {
            return NextResponse.json({ message: 'No pair data found' }, { status: 404 });
        }

        const relevantPair = data.pairs.find((p: any) =>
            ['WETH', 'ETH', 'USDC', 'USDT'].includes(p.quoteToken.symbol)
        );
        const pair = relevantPair || data.pairs[0];

        const rawData: TokenMarqueeRawData = {
            tokenName: pair.baseToken?.symbol || 'N/A',
            priceUsd: parseFloat(pair.priceUsd) || 0,
            marketCap: pair.fdv || 0,
            liquidity: pair.liquidity?.usd || 0,
            priceChange_h1: pair.priceChange?.h1 || 0,
        };

        return NextResponse.json(rawData);

    } catch (error) {
        console.error('Error fetching token details:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
