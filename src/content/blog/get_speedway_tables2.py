import sys
import re
import requests
from bs4 import BeautifulSoup

def get_british_speedway_table():
    print("\nFetching British Speedway Premiership Table...")
    url = "https://britishspeedway.co.uk"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")
        league_table = None
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if not rows: continue
            first_data_cells = rows[1].find_all("td") if len(rows) > 1 else []
            if len(first_data_cells) >= 7 and any(club in table.text.upper() for club in ["LEICESTER", "BELLE VUE", "SHEFFIELD"]):
                league_table = table
                break
        if not league_table:
            print("❌ Could not isolate the main Premiership league standings table.")
            return

        print("\n### 🏁 2026 ROWE Motor Oil Premiership League Table\n")
        print("| Pos | Team Name | M | W | D | L | F | A | Pts |")
        print("| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |")
        for row in league_table.find_all("tr"):
            cells = [td.text.strip() for td in row.find_all("td")]
            if cells and len(cells) >= 7:
                clean_row = [cells[0], " ".join(cells[1].split())] + cells[2:9]
                print("| " + " | ".join(clean_row) + " |")
    except Exception as e:
        print("❌ Error parsing British Speedway details: {}".format(str(e)))

def get_pge_ekstraliga_table():
    print("\nFetching Polish PGE Ekstraliga Table from HTML Source...")
    url = "https://ekstraliga.pl"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")
        table = soup.find("table") or soup.find(class_=re.compile("table", re.I))
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

def generate_match_report(url):
    print("\nScraping Match Details from: {} ...".format(url))
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Fallback names if page scrapers miss elements
        home_team = "Home Team"
        away_team = "Away Team"
        home_score = "XX"
        away_score = "XX"
        
        # Match up team text patterns from structure hierarchy
        team_elements = soup.find_all(class_=re.compile(r"team|club|name", re.I))
        if len(team_elements) >= 2:
            home_team = " ".join(dict.fromkeys(team_elements[0].text.strip().split()))
            away_team = " ".join(dict.fromkeys(team_elements[1].text.strip().split()))
            
        print("\n---")
        print("title: \"{} vs {} PGE Ekstraliga Play-Off Match Report\"".format(home_team, away_team))
        print("pubDate: \"2026-09-06\"")
        print("description: \"Full race results, heat metrics, and individual scoring charts from the PGE Ekstraliga fixture.\"")
        print("author: \"SpeedwayWorld WebTeam\"")
        print("tags:\n  - \"news\"\n  - \"PGE\"\n  - \"Ekstraliga\"")
        print("category: \"Polish Speedway\"")
        print("---\n")
        
        print("**A dramatic encounter unfolded as {} went head-to-head against {} in high-stakes PGE Ekstraliga action.**\n".format(home_team, away_team))
        print("## Heat-by-Heat Score Tracker\n")
        
        # Scrape textual summary points
        for block in soup.find_all(["p", "div", "li"]):
            txt = block.text.strip()
            if "Heat " in txt and len(txt) < 10:
                print("\n### " + txt)
            elif re.search(r"^[a-d]\s", txt):
                print("* " + " ".join(txt.split()))
            elif "The foursome" in txt or "The visitors" in txt or "A fantastic race" in txt:
                print("\n> " + " ".join(txt.split()))
                
        print("\n***\n*Scraped live database updates via SpeedwayWorld.*")
    except Exception as e:
        print("❌ Error generating match details: {}".format(str(e)))

if __name__ == "__main__":
    print("Select an action:\n1: Print League Tables\n2: Generate Individual Match Report")
    choice = input("Enter choice (1 or 2): ")
    if choice == "2":
        match_url = input("Paste the Ekstraliga match URL: ")
        generate_match_report(match_url)
    else:
        get_british_speedway_table()
        print("\n" + "="*50 + "\n")
        get_pge_ekstraliga_table()
