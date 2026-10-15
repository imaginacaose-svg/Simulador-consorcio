export interface FinancingResult {
  totalPaid: number;
  totalInterest: number;
  monthlyPayment: number;
  monthlyRate: number;
}

export const calculateGenericFinancing = (
  principal: number,
  months: number,
  annualRate: number
): FinancingResult => {
  const monthlyRate = annualRate / 100 / 12;
  
  // Fórmula da Tabela Price (parcelas fixas)
  // PMT = P * [i(1+i)^n] / [(1+i)^n - 1]
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  
  const totalPaid = monthlyPayment * months;
  const totalInterest = totalPaid - principal;

  return {
    totalPaid,
    totalInterest,
    monthlyPayment,
    monthlyRate,
  };
};