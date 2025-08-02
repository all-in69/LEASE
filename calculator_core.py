# calculator_core.py

def oblicz_rate(wartosc_auta, wklad_wlasny_proc, okres_mies, wykup_proc, marza_proc, wibor_proc):
    """
    Oblicza miesięczną ratę leasingu oraz składniki kosztów.
    Zwraca słownik z wynikami lub błędem.
    """
    # --- POPRAWKA: Walidacja danych wejściowych ---
    if okres_mies <= 0:
        return {'error': 'Okres leasingu musi byc wiekszy od zera.'}
    if wartosc_auta <= 0:
        return {'error': 'Wartosc auta musi byc wieksza od zera.'}

    wklad_wlasny_kwota_netto = (wartosc_auta * (wklad_wlasny_proc / 100.0))
    wykup_kwota_netto = (wartosc_auta * (wykup_proc / 100.0))
    
    kwota_finansowana = wartosc_auta - wklad_wlasny_kwota_netto
    oprocentowanie_roczne = (wibor_proc + marza_proc) / 100.0

    czesc_kapitalowa = (kwota_finansowana - wykup_kwota_netto) / okres_mies
    czesc_odsetkowa = (kwota_finansowana * oprocentowanie_roczne) / 12
    rata_netto = czesc_kapitalowa + czesc_odsetkowa

    suma_rat_netto = rata_netto * okres_mies
    
    skladniki_kosztu = {
        'wklad_wlasny': round(wklad_wlasny_kwota_netto, 2),
        'suma_rat': round(suma_rat_netto, 2),
        'wykup': round(wykup_kwota_netto, 2)
    }

    return {
        'rata_netto': round(rata_netto, 2),
        'skladniki_kosztu': skladniki_kosztu
    }

def oblicz_tarcze_podatkowa(skladniki_kosztu, tax_rate_proc):
    koszt_leasingu = skladniki_kosztu['wklad_wlasny'] + skladniki_kosztu['suma_rat']
    tarcza = koszt_leasingu * (tax_rate_proc / 100.0)
    return round(tarcza, 2)

def oblicz_wartosc_auta(rata_miesieczna_netto, wklad_wlasny, okres_mies, wykup, marza_proc, wibor_proc):
    if okres_mies <= 0:
        return {'error': 'Okres leasingu musi byc wiekszy od zera.'}
        
    marza = marza_proc / 100.0
    wibor = wibor_proc / 100.0
    oprocentowanie_roczne = marza + wibor
    lewa_strona = rata_miesieczna_netto
    if wklad_wlasny['type'] == 'amount':
        lewa_strona += (wklad_wlasny['value'] / okres_mies) + (wklad_wlasny['value'] * oprocentowanie_roczne / 12)
    if wykup['type'] == 'amount':
        lewa_strona += wykup['value'] / okres_mies
    prawa_strona = (1 / okres_mies) + (oprocentowanie_roczne / 12)
    if wklad_wlasny['type'] == 'percent':
        prawa_strona -= (wklad_wlasny['value'] / 100.0) / okres_mies
        prawa_strona -= (wklad_wlasny['value'] / 100.0) * oprocentowanie_roczne / 12
    if wykup['type'] == 'percent':
        prawa_strona -= (wykup['value'] / 100.0) / okres_mies
    if prawa_strona <= 0:
        return 0.0
    wartosc_auta_netto = lewa_strona / prawa_strona
    return round(wartosc_auta_netto, 2)
