# pdf_generator.py

import datetime
from fpdf import FPDF

class OfferPDF(FPDF):
    def header(self):
        # Możesz odkomentować tę linię i podać ścieżkę do swojego logo
        # self.image('logo.png', 10, 8, 33) 
        self.set_font('helvetica', 'B', 20)
        self.cell(80) # Przesunięcie w prawo
        self.cell(30, 10, 'Oferta Leasingowa', 0, 0, 'C')
        self.ln(25)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Strona {self.page_no()}', 0, 0, 'C')
        self.set_y(-25)
        self.set_font('helvetica', 'I', 8)
        self.multi_cell(0, 5,
            'Powyzsza kalkulacja ma charakter wylacznie informacyjny i nie stanowi oferty handlowej w rozumieniu '
            'art. 66 § 1 Kodeksu Cywilnego. Finalne warunki leasingu zaleza od oceny zdolnosci kredytowej klienta.',
            0, 'C'
        )
        
    def add_watermark(self, text):
        """Dodaje znak wodny w tle strony."""
        self.set_font('helvetica', 'B', 50)
        self.set_text_color(230, 230, 230) # Bardzo jasny szary
        # Obrót tekstu i umieszczenie go na środku
        self.rotate(45, x=self.w / 2, y=self.h / 2)
        self.text(x=self.w / 4, y=self.h / 2, txt=text)
        self.rotate(0) # Zatrzymanie obrotu
        # Przywrócenie domyślnego koloru tekstu
        self.set_text_color(0, 0, 0)

    def chapter_title(self, title):
        """Metoda do tworzenia tytułów sekcji."""
        self.set_font('helvetica', 'B', 14)
        self.set_text_color(24, 69, 117) # Ciemnoniebieski
        self.cell(0, 10, title, 0, 1, 'L')
        self.ln(4)

    def offer_body(self, data, result):
        """Metoda do tworzenia głównej treści oferty."""
        # --- Sekcja: Parametry Kalkulacji ---
        self.chapter_title('Parametry Kalkulacji')
        self.set_font('helvetica', '', 11)
        self.set_text_color(0, 0, 0) # Czarny

        line_height = 10
        col_width = 95
        
        # --- POPRAWKA: Usunięto Marżę i WIBOR z listy ---
        labels = {
            'wartosc_auta_brutto': 'Wartosc pojazdu (brutto)',
            'wklad_wlasny_opis': 'Wklad wlasny',
            'okres_mies': 'Okres leasingu',
            'wykup_opis': 'Wartosc wykupu'
        }

        # Rysowanie tabeli z parametrami
        for key, label in labels.items():
            if key in data:
                self.cell(col_width, line_height, f'  {label}', border=1)
                self.cell(col_width, line_height, f'{str(data[key])}  ', border=1, ln=1, align='R')

        self.ln(10)

        # --- Sekcja: Wynik Kalkulacji ---
        self.chapter_title('Wynik Kalkulacji')
        
        # Wyróżnione tło dla wyników
        self.set_fill_color(230, 242, 255) # Jasnoniebieski
        
        # --- POPRAWKA: Pogrubienie dla kwoty netto ---
        self.set_font('helvetica', 'B', 12) 
        self.cell(col_width, line_height, '  Miesieczna rata netto:', border=1)
        self.cell(col_width, line_height, f"{result['rata_netto']} PLN  ", border=1, ln=1, align='R', fill=True)
        
        # --- POPRAWKA: Normalny font dla kwoty brutto ---
        self.set_font('helvetica', '', 12) 
        self.cell(col_width, line_height, '  Miesieczna rata brutto:', border=1)
        self.cell(col_width, line_height, f"{result['rata_brutto']} PLN  ", border=1, ln=1, align='R', fill=True)
        
        self.ln(15)

        # --- Sekcja: Data Wygenerowania ---
        self.set_font('helvetica', 'I', 9)
        self.set_text_color(128, 128, 128) # Szary
        today = datetime.date.today().strftime("%d-%m-%Y")
        self.cell(0, 10, f'Oferta wygenerowana dnia: {today}', 0, 1, 'R')


def create_offer_pdf(data):
    """Główna funkcja tworząca PDF i zwracająca go jako bajty."""
    pdf = OfferPDF('P', 'mm', 'A4')
    pdf.add_page()
    pdf.add_watermark('HUZOPRESTIGE') # Dodanie znaku wodnego
    pdf.offer_body(data['params'], data['result'])
    
    return bytes(pdf.output(dest='S'))
