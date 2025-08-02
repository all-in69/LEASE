// src/Calculator.js
import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- POPRAWKA: Zdefiniowanie publicznego adresu API ---
// Upewnij się, że ten adres URL jest poprawnym adresem Twojej aplikacji na Render
const API_BASE_URL = 'https://lease-1.onrender.com';

const VAT_RATE = 1.23;
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

const Calculator = () => {
    // Stany
    const [mode, setMode] = useState('rate');
    const [priceType, setPriceType] = useState('brutto');
    const [carValue, setCarValue] = useState(150000);
    const [downPayment, setDownPayment] = useState(10);
    const [downPaymentAmount, setDownPaymentAmount] = useState(15000);
    const [downPaymentType, setDownPaymentType] = useState('percent');
    const [leaseTerm, setLeaseTerm] = useState(36);
    const [buyout, setBuyout] = useState(25);
    const [buyoutAmount, setBuyoutAmount] = useState(37500);
    const [buyoutType, setBuyoutType] = useState('percent');
    const [margin, setMargin] = useState(3.0);
    const [wibor, setWibor] = useState(5.8);
    const [monthlyRate, setMonthlyRate] = useState(3300);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [sendEmail, setSendEmail] = useState(false);
    const [clientEmail, setClientEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [taxRate, setTaxRate] = useState(19);
    const [showMargin, setShowMargin] = useState(false);

    const handleModeChange = (newMode) => setMode(newMode);

    const runCalculation = useCallback(async () => {
        let endpoint = '';
        let payload = {};
        const carValueNum = parseFloat(carValue) || 0;
        const downPaymentNum = parseFloat(downPayment) || 0;
        const downPaymentAmountNum = parseFloat(downPaymentAmount) || 0;
        const leaseTermNum = parseInt(leaseTerm) || 0;
        const buyoutNum = parseFloat(buyout) || 0;
        const buyoutAmountNum = parseFloat(buyoutAmount) || 0;
        const marginNum = parseFloat(margin) || 0;
        const wiborNum = parseFloat(wibor) || 0;
        const monthlyRateNum = parseFloat(monthlyRate) || 0;
        const taxRateNum = parseFloat(taxRate) || 0;

        if (mode === 'rate') {
            if (carValueNum <= 0 || leaseTermNum <= 0) {
                setResult(null);
                return;
            }
            // --- POPRAWKA: Użycie nowego adresu API ---
            endpoint = `${API_BASE_URL}/api/calculate_rate`;
            const carValueNet = priceType === 'brutto' ? carValueNum / VAT_RATE : carValueNum;
            payload = {
                wartosc_auta: carValueNet,
                wklad_wlasny_proc: downPaymentType === 'percent' ? downPaymentNum : (downPaymentAmountNum / carValueNet) * 100,
                okres_mies: leaseTermNum,
                wykup_proc: buyoutType === 'percent' ? buyoutNum : (buyoutAmountNum / carValueNet) * 100,
                marza_proc: marginNum,
                wibor_proc: wiborNum,
                tax_rate_proc: taxRateNum,
            };
        } else {
            if (monthlyRateNum <= 0 || leaseTermNum <= 0) {
                setResult(null);
                return;
            }
            // --- POPRAWKA: Użycie nowego adresu API ---
            endpoint = `${API_BASE_URL}/api/calculate_value`;
            const monthlyRateNet = priceType === 'brutto' ? monthlyRateNum / VAT_RATE : monthlyRateNum;
            payload = {
                rata_miesieczna_netto: monthlyRateNet,
                wklad_wlasny: { type: downPaymentType, value: downPaymentType === 'percent' ? downPaymentNum : downPaymentAmountNum },
                okres_mies: leaseTermNum,
                wykup: { type: buyoutType, value: buyoutType === 'percent' ? buyoutNum : buyoutAmountNum },
                marza_proc: marginNum,
                wibor_proc: wiborNum,
            };
        }
        try {
            setError('');
            const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Błąd odpowiedzi serwera' }));
                throw new Error(errorData.error);
            }
            const data = await response.json();
            
            if (mode === 'rate') {
                const rataNettoNum = parseFloat(data.rata_netto);
                if (data && !isNaN(rataNettoNum)) {
                    setResult({
                        rata_netto: rataNettoNum.toFixed(2),
                        rata_brutto: (rataNettoNum * VAT_RATE).toFixed(2),
                        chart_data: [
                            { name: 'Wkład własny', value: data.chart_data.wklad_wlasny },
                            { name: 'Suma rat', value: data.chart_data.suma_rat },
                            { name: 'Wykup', value: data.chart_data.wykup },
                        ],
                        tax_shield: data.tax_shield,
                    });
                } else {
                    throw new Error("Otrzymano nieprawidłowe dane z serwera (rata).");
                }
            } else if (mode === 'value') {
                const wartoscAutaNettoNum = parseFloat(data.wartosc_auta_netto);
                if (data && !isNaN(wartoscAutaNettoNum)) {
                    setResult({
                        wartosc_auta_netto: wartoscAutaNettoNum.toFixed(2),
                        wartosc_auta_brutto: (wartoscAutaNettoNum * VAT_RATE).toFixed(2),
                        chart_data: null,
                        tax_shield: null,
                    });
                } else {
                    throw new Error("Otrzymano nieprawidłowe dane z serwera (wartość).");
                }
            }
        } catch (err) {
            setError(err.message || 'Nie można było wykonać obliczeń.');
            console.error(err);
        }
    }, [mode, priceType, carValue, downPayment, downPaymentAmount, downPaymentType, leaseTerm, buyout, buyoutAmount, buyoutType, margin, wibor, monthlyRate, taxRate]);

    useEffect(() => {
        const handler = setTimeout(() => runCalculation(), 500);
        return () => clearTimeout(handler);
    }, [runCalculation]);

    const handleProcessOffer = async () => {
        if (!result) return;
        if (sendEmail && !clientEmail) {
            setError("Wprowadź adres e-mail klienta.");
            return;
        }

        setIsProcessing(true);
        setError('');

        const carValueBruttoRaw = mode === 'rate' ? parseFloat(carValue) : parseFloat(result.wartosc_auta_brutto);
        if (!carValueBruttoRaw || carValueBruttoRaw <= 0) {
            setError("Wartość pojazdu musi być dodatnia.");
            setIsProcessing(false);
            return;
        }
        const carValueBrutto = carValueBruttoRaw.toFixed(2);
        const downPaymentDescription = downPaymentType === 'percent' ? `${downPayment}% (${(carValueBruttoRaw * parseFloat(downPayment) / 100).toFixed(2)} PLN)` : `${downPaymentAmount} PLN (${(parseFloat(downPaymentAmount) / carValueBruttoRaw * 100).toFixed(2)}%)`;
        const buyoutDescription = buyoutType === 'percent' ? `${buyout}% (${(carValueBruttoRaw * parseFloat(buyout) / 100).toFixed(2)} PLN)` : `${buyoutAmount} PLN (${(parseFloat(buyoutAmount) / carValueBruttoRaw * 100).toFixed(2)}%)`;

        const payload = {
            params: {
                wartosc_auta_brutto: `${carValueBrutto} PLN`,
                wklad_wlasny_opis: downPaymentDescription,
                okres_mies: `${leaseTerm} mies.`,
                wykup_opis: buyoutDescription,
                marza_proc: `${margin}%`,
                wibor_proc: `${wibor}%`,
            },
            result: result,
            email_details: {
                send: sendEmail,
                recipient: clientEmail
            }
        };

        try {
            // --- POPRAWKA: Użycie nowego adresu API ---
            const response = await fetch(`${API_BASE_URL}/api/process_offer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Błąd serwera');
            }
            
            const byteCharacters = atob(responseData.pdf_data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: 'application/pdf'});

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'oferta_leasingowa.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            if (responseData.email_status) {
                alert(responseData.email_status);
            }

        } catch (err) {
            console.error(err);
            setError(err.message || 'Nie udało się przetworzyć oferty.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="calculator">
            <h1>Kalkulator Leasingowy</h1>
            <div className="mode-switcher">
                <label><input type="radio" name="mode" value="rate" checked={mode === 'rate'} onChange={() => handleModeChange('rate')} /><span>Oblicz ratę</span></label>
                <label><input type="radio" name="mode" value="value" checked={mode === 'value'} onChange={() => handleModeChange('value')} /><span>Oblicz wartość pojazdu</span></label>
            </div>
            <div className="form-grid">
                <div className="input-column">
                    {mode === 'rate' ? (<div className="form-group"><div className="label-switcher"><label>Wartość pojazdu</label><div className="unit-toggle"><button onClick={() => setPriceType('netto')} className={priceType === 'netto' ? 'active' : ''}>Netto</button><button onClick={() => setPriceType('brutto')} className={priceType === 'brutto' ? 'active' : ''}>Brutto</button></div></div><input type="number" value={carValue} onChange={(e) => setCarValue(e.target.value)} /></div>) : (<div className="form-group"><div className="label-switcher"><label>Miesięczna rata</label><div className="unit-toggle"><button onClick={() => setPriceType('netto')} className={priceType === 'netto' ? 'active' : ''}>Netto</button><button onClick={() => setPriceType('brutto')} className={priceType === 'brutto' ? 'active' : ''}>Brutto</button></div></div><input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} /></div>)}
                    <div className="form-group"><div className="label-switcher"><label>Wkład własny</label><div className="unit-toggle"><button onClick={() => setDownPaymentType('percent')} className={downPaymentType === 'percent' ? 'active' : ''}>%</button><button onClick={() => setDownPaymentType('amount')} className={downPaymentType === 'amount' ? 'active' : ''}>PLN</button></div></div>{downPaymentType === 'percent' ? (<input type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />) : (<input type="number" value={downPaymentAmount} onChange={(e) => setDownPaymentAmount(e.target.value)} />)}</div>
                    <div className="form-group"><label>Okres leasingu (mies.)</label><input type="number" value={leaseTerm} onChange={(e) => setLeaseTerm(e.target.value)} /></div>
                    <div className="form-group"><div className="label-switcher"><label>Wartość wykupu</label><div className="unit-toggle"><button onClick={() => setBuyoutType('percent')} className={buyoutType === 'percent' ? 'active' : ''}>%</button><button onClick={() => setBuyoutType('amount')} className={buyoutType === 'amount' ? 'active' : ''}>PLN</button></div></div>{buyoutType === 'percent' ? (<input type="number" value={buyout} onChange={(e) => setBuyout(e.target.value)} />) : (<input type="number" value={buyoutAmount} onChange={(e) => setBuyoutAmount(e.target.value)} />)}</div>
                    
                    <div className="form-group">
                        <label>WIBOR (%)</label>
                        <input type="number" step="0.1" value={wibor} onChange={(e) => setWibor(e.target.value)} />
                    </div>
                    
                    {mode === 'rate' && (
                        <div className="form-group">
                            <label>Stawka podatku dochodowego (%)</label>
                            <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                        </div>
                    )}

                    <div className="form-group-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={showMargin}
                                onChange={(e) => setShowMargin(e.target.checked)}
                            />
                             <span style={{marginLeft: '8px', fontStyle: 'italic', color: '#606770'}}>Pokaż opcje zaawansowane</span>
                        </label>
                    </div>

                    {showMargin && (
                        <div className="form-group">
                            <label>Marża (%)</label>
                            <input type="number" step="0.1" value={margin} onChange={(e) => setMargin(e.target.value)} />
                        </div>
                    )}
                </div>
                <div className="result-column">
                    <h2>Wynik</h2>
                    <div className="result-box">
                        {error ? <span className="error-message" style={{color: 'red'}}>{error}</span> : mode === 'rate' && result ? (<><span>Miesięczna rata</span><span className="result-value">{result.rata_brutto} PLN brutto</span><span className="result-secondary">{result.rata_netto} PLN netto</span></>) : mode === 'value' && result ? (<><span>Maks. wartość pojazdu</span><span className="result-value">{result.wartosc_auta_brutto} PLN brutto</span><span className="result-secondary">{result.wartosc_auta_netto} PLN netto</span></>) : ('...')}
                    </div>

                    {mode === 'rate' && result && (
                        <>
                            <div className="extra-results">
                                {result.tax_shield != null && (
                                    <div className="tax-shield">
                                        <h4>Tarcza Podatkowa</h4>
                                        <span>Oszczędność na podatku: <strong>{result.tax_shield.toFixed(2)} PLN</strong></span>
                                    </div>
                                )}
                                <div className="chart-container">
                                    <h4>Struktura kosztów (netto)</h4>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie data={result.chart_data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                                {result.chart_data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value.toFixed(2)} PLN`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="email-section">
                        <label className="email-checkbox"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Wyślij ofertę na e-mail klienta</label>
                        {sendEmail && (<input type="email" className="email-input" placeholder="adres@email.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />)}
                    </div>
                    <button className="pdf-button" onClick={handleProcessOffer} disabled={!result || isProcessing}>{isProcessing ? 'Przetwarzanie...' : 'Pobierz PDF / Wyślij Ofertę'}</button>
                </div>
            </div>
        </div>
    );
};

export default Calculator;
