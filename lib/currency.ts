/**
 * Currency formatting utility for Nepali Rupees (NPR)
 */

/**
 * Format a number as Nepali Rupees (रू)
 * @param amount - The numeric amount to format
 * @param showDecimal - Whether to show decimal places (default: true)
 * @returns Formatted string like "रू 24,500.00"
 */
export function formatNPR(amount: number, showDecimal: boolean = true): string {
    if (amount === null || amount === undefined || isNaN(amount)) return 'रू 0'

    const formatted = showDecimal
        ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : amount.toLocaleString('en-IN')

    return `रू ${formatted}`
}

/**
 * Format NPR for chart tooltips (abbreviated)
 */
export function formatNPRShort(amount: number): string {
    if (amount >= 10000000) return `रू ${(amount / 10000000).toFixed(1)}Cr`
    if (amount >= 100000) return `रू ${(amount / 100000).toFixed(1)}L`
    if (amount >= 1000) return `रू ${(amount / 1000).toFixed(1)}K`
    return formatNPR(amount, false)
}
