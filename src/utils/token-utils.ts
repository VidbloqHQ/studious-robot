export const getTokenBalance = async (pubkey: string) => {
  const heliusApiKey = "10b8f1fb-6b38-43cb-a769-e6965206020e";
  const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const heliusResponse = await fetch(
    `https://api.helius.xyz/v0/addresses/${pubkey}/balances?api-key=${heliusApiKey}`,
    {
      headers: { "x-api-key": heliusApiKey },
      signal: AbortSignal.timeout(5000), // modern equivalent of timeout option
    }
  );

  if (!heliusResponse.ok) {
    throw new Error(`Helius API error: ${heliusResponse.status}`);
  }

  const heliusData = await heliusResponse.json();

  const findTokenBalance = (mint: string, decimals: number = 6) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = heliusData?.tokens?.find((t: any) => t.mint === mint);
        console.log(decimals)
    return token ? token.amount / Math.pow(10, token.decimals) : 0;
  };

  const onChainBalance = {
    usdc: findTokenBalance(USDC_MINT, 6),
    // usdStar: findTokenBalance(USD_STAR_MINT, 6),
  };

  return { onChainBalance };
};
