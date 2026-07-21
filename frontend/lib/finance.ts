// Finance screens use Nepalese rupees consistently. Keep the symbol explicit
// (instead of relying on browser currency data, which may render "NPR").
export function formatRs(value: number | string | null | undefined, decimals = 2): string {
    const amount = Number(value ?? 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    return `Rs. ${safeAmount.toLocaleString('en-NP', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}`;
}

