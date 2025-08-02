# app.py

import smtplib
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from flask import Flask, request, jsonify
from calculator_core import oblicz_rate, oblicz_wartosc_auta, oblicz_tarcze_podatkowa
from pdf_generator import create_offer_pdf
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Konfiguracja e-mail
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
EMAIL_SENDER = 'TWÓJ_EMAIL@gmail.com'
EMAIL_PASSWORD = 'TWOJE_HASLO_APLIKACJI'

def send_email_with_attachment(recipient_email, pdf_data):
    # ... (bez zmian)
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_SENDER
        msg['To'] = recipient_email
        msg['Subject'] = 'Oferta leasingowa HUZOPRESTIGE'
        body = 'Dziękujemy za zainteresowanie naszą ofertą. W załączniku przesyłamy przygotowaną kalkulację leasingową.\n\nZ pozdrowieniami,\nZespół HUZOPRESTIGE'
        msg.attach(MIMEText(body, 'plain'))
        attachment = MIMEApplication(pdf_data, _subtype='pdf')
        attachment.add_header('Content-Disposition', 'attachment', filename='oferta_leasingowa.pdf')
        msg.attach(attachment)
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        return "E-mail został pomyślnie wysłany."
    except Exception as e:
        print(f"Błąd wysyłki e-mail: {e}")
        return f"Nie udało się wysłać e-maila: {e}"

@app.route('/api/calculate_rate', methods=['POST'])
def handle_calculate_rate():
    data = request.get_json()
    required_fields = ['wartosc_auta', 'wklad_wlasny_proc', 'okres_mies', 'wykup_proc', 'marza_proc', 'wibor_proc']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Brakujące dane w zapytaniu'}), 400
    
    try:
        wyniki_obliczen = oblicz_rate(
            data['wartosc_auta'], data['wklad_wlasny_proc'], data['okres_mies'],
            data['wykup_proc'], data['marza_proc'], data['wibor_proc']
        )
        
        # --- POPRAWKA: Sprawdzenie, czy funkcja obliczeniowa zwróciła błąd ---
        if 'error' in wyniki_obliczen:
            return jsonify(wyniki_obliczen), 400

        tarcza = None
        if 'tax_rate_proc' in data and data['tax_rate_proc'] > 0:
            tarcza = oblicz_tarcze_podatkowa(
                wyniki_obliczen['skladniki_kosztu'],
                data['tax_rate_proc']
            )

        response_data = {
            'rata_netto': wyniki_obliczen['rata_netto'],
            'chart_data': wyniki_obliczen['skladniki_kosztu'],
            'tax_shield': tarcza
        }
        return jsonify(response_data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/calculate_value', methods=['POST'])
def handle_calculate_value():
    data = request.get_json()
    try:
        wartosc = oblicz_wartosc_auta(data['rata_miesieczna_netto'], data['wklad_wlasny'], data['okres_mies'], data['wykup'], data['marza_proc'], data['wibor_proc'])
        
        # --- POPRAWKA: Sprawdzenie, czy funkcja obliczeniowa zwróciła błąd ---
        if isinstance(wartosc, dict) and 'error' in wartosc:
             return jsonify(wartosc), 400

        return jsonify({'wartosc_auta_netto': wartosc})
    except Exception as e: return jsonify({'error': str(e)}), 500

@app.route('/api/process_offer', methods=['POST'])
def handle_process_offer():
    # ... (bez zmian)
    data = request.get_json()
    if not data or 'params' not in data or 'result' not in data:
        return jsonify({'error': 'Niekompletne dane do przetworzenia oferty'}), 400
    try:
        pdf_bytes = create_offer_pdf(data)
        email_status = None
        if data.get('email_details', {}).get('send'):
            recipient = data['email_details'].get('recipient')
            if recipient:
                email_status = send_email_with_attachment(recipient, pdf_bytes)
            else:
                email_status = "Nie podano adresu e-mail odbiorcy."
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        response_data = {'message': 'Oferta przetworzona.', 'pdf_data': pdf_base64}
        if email_status:
            response_data['email_status'] = email_status
        return jsonify(response_data)
    except Exception as e:
        print(f"Błąd w /api/process_offer: {e}")
        return jsonify({'error': f'Błąd podczas przetwarzania oferty: {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
