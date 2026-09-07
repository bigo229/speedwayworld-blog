import sys
import re
import requests
from bs4 import BeautifulSoup

def get_british_speedway_table():
    print("Fetching British Speedway Premiership Table...")
    url = "https://britishspeedway.co.uk/2026-premiership-table-fixtures-results/"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")
        
        league_table = None
        
        # Loop through all table layouts on the page
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if not rows:
                continue
                
            # Scan the first few rows to check column length
            first_data_cells = rows[1].find_all("td") if len(rows) > 1 else []
            
            # The true league table is dense and has 7 to 9 narrow statistical columns
            if len(first_data_cells) >= 7 and any(club in table.text.upper() for club in ["LEICESTER", "BELLE VUE", "SHEFFIELD"]):
                league_table = table
                break
                
        if not league_table:
            # Emergency fallback: use the first table that isn't a long narrative block
            for table in soup.find_all("table"):
                if len(table.find_all("th")) >= 7:
                    league_table = table
                    break

        if not league_table:
            print("❌ Could not isolate the main Premiership league standings table.")
            return

        print("\n### 🏁 2026 ROWE Motor Oil Premiership League Table\n")
        
        # Build clean custom headers matching official BSPL layouts
        print("| Pos | Team Name | M | W | D | L | F | A | Pts |")
        print("| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |")
        
        # Parse data rows cleanly
        for row in league_table.find_all("tr"):
            cells = [td.text.strip() for td in row.find_all("td")]
            if cells and len(cells) >= 7:
                # Format into a clean, uniform markdown row string
                clean_row = [cells[0], " ".join(cells[1].split())] + cells[2:9]
                print("| " + " | ".join(clean_row) + " |")
                
    except Exception as e:
        print("❌ Error parsing British Speedway details: {}".format(str(e)))

def get_pge_ekstraliga_table():
    print("\nFetching Polish PGE Ekstraliga Table from HTML Source...")
    url = "https://ekstraliga.pl"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")
        
        table = soup.find("table")
        if not table:
            table = soup.find(class_=re.compile("table", re.I))
            
        if not table:
            print("❌ Could not locate the table structure inside the Polish Ekstraliga HTML page.")
            return

        print("\n### 🏁 2026 PGE Ekstraliga League Table (Poland)\n")
        print("| Pos | Team Name | M | W | R | P | B | PKT | +/- |")
        print("| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |")
        
        for row in table.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 9:
                pos = cells[1].text.strip().replace(".", "")
                team_raw = cells[2].text.strip()
                
                team_clean = " ".join(dict.fromkeys(team_raw.split()))
                metrics = [td.text.strip() for td in cells[3:10]]
                
                row_data = [pos, team_clean] + metrics
                print("| " + " | ".join(row_data) + " |")
                
    except Exception as e:
        print("❌ Error parsing Polish Ekstraliga details: {}".format(str(e)))

if __name__ == "__main__":
    get_british_speedway_table()
    print("\n" + "="*50 + "\n")
    get_pge_ekstraliga_table()

