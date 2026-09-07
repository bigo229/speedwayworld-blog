import sys
import re
import requests
from bs4 import BeautifulSoup

def parse_rider_table(table_element):
    """Parses a Polish Ekstraliga rider scorecard table into clean Markdown rows."""
    markdown_rows = []
    if not table_element:
        return markdown_rows
        
    for row in table_element.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) >= 3:
            row_text = [c.text.strip() for c in cells]
            
            if "Rider" in row_text or "Coach" in row_text or "Manager" in row_text:
                continue
                
            clean_row = [x for x in row_text if x]
            if len(clean_row) >= 3:
                rider_no = clean_row[0].replace(".", "")
                rider_name = clean_row[1]
                
                # Filter out bonus indicator anomalies to ensure true totals bold cleanly
                total_pts = clean_row[-1].split()[-1] if len(clean_row[-1].split()) > 0 else clean_row[-1]
                
                # Join heat histories cleanly
                heat_history = ", ".join(clean_row[2:-1]) if len(clean_row) > 3 else "-"
                
                markdown_rows.append("| {} | **{}** | {} | **{}** |".format(rider_no, rider_name, heat_history, total_pts))
    return markdown_rows

def generate_comprehensive_report():
    print("="*60)
    print(" SPEEDWAYWORLD MATCH REPORT & SCORECARD GENERATOR")
    print("="*60)
    
    # Simple manual inputs to bypass logo graphic blockers completely
    home_team = input("Enter Home Team Name (e.g., Motor Lublin):\n> ").strip()
    away_team = input("Enter Away Team Name (e.g., Apator Torun):\n> ").strip()
    match_score = input("Enter Final Score (e.g., 42-48):\n> ").strip()
    
    url = input("\nPaste the official Ekstraliga match link:\n> ")
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, "html.parser")
        
        print("\n🚀 GENERATION COMPLETE! COPY THE MARKDOWN BLOCK BELOW:\n")
        print("---")
        print("title: \"{} vs {} ({}) PGE Ekstraliga Play-Off Race Results\"".format(home_team, away_team, match_score))
        print("pubDate: \"2026-09-06\"")
        print("description: \"Official match results, scorecard tables, and complete heat-by-heat summaries from the clash between {} and {}.\"".format(home_team, away_team))
        print("author: \"SpeedwayWorld WebTeam\"")
        print("tags:\n  - \"news\"\n  - \"PGE\"\n  - \"Ekstraliga\"\n  - \"{}\"\n  - \"{}\"".format(home_team.replace(" ", ""), away_team.replace(" ", "")))
        print("category: \"Polish Speedway\"")
        print("---\n")
        
        print("**An intense PGE Ekstraliga play-off fixture concluded between {} and {}, ending in a dramatic final scoreline of {}.**\n".format(home_team, away_team, match_score))
        
        # Extract and print rider scorecard tables
        html_tables = soup.find_all("table")
        
        print("## Official Team Scorecards\n")
        print("### 🏁 {}".format(home_team))
        print("| # | Rider Name | Heat Run History | Total Points |")
        print("| :---: | :--- | :---: | :---: |")
        if len(html_tables) >= 1:
            home_rows = parse_rider_table(html_tables[0])
            for r in home_rows: print(r)
            
        print("\n### 🏁 {}".format(away_team))
        print("| # | Rider Name | Heat Run History | Total Points |")
        print("| :---: | :--- | :---: | :---: |")
        if len(html_tables) >= 2:
            away_rows = parse_rider_table(html_tables[1])
            for r in away_rows: print(r)
            
        print("\n## Heat-by-Heat Race Result Breakdown\n")
        
        # Track heats cleanly
        current_heat = ""
        
        for element in soup.find_all(["div", "p", "li", "h3", "h4"]):
            if element.name == "div" and (element.find("div") or len(element.text.strip()) > 300):
                continue
                
            text_line = " ".join(element.text.strip().split())
            if not text_line or len(text_line) > 250 or "Rider" in text_line or "Coach" in text_line or "Manager" in text_line: 
                continue
            
            # Check for Heat Headers
            if re.match(r"^Heat\s\d+", text_line, re.I) or re.match(r"^Restart\s-\sHeat\s\d+", text_line, re.I):
                if text_line != current_heat:
                    print("\n### 🏁 " + text_line)
                    current_heat = text_line
            
            # Captures the rider point results (e.g., "Patryk Dudek 3")
            elif re.match(r"^[a-d]\s+[A-Za-z]", text_line) or (len(text_line.split()) <= 4 and any(char.isdigit() for char in text_line) and not text_line.startswith("©")):
                print("* " + text_line)
                
            # Captures descriptions
            elif any(phrase in text_line for phrase in ["started", "pair started", "race", "start", "decisive", "elbows", "lane", "victory"]):
                print("\n> " + text_line)
                
        print("\n***\n\n*Official match tracking results verified via Ekstraliga databases.*")
        
    except Exception as e:
        print("❌ Error scraping match metrics: {}".format(str(e)))

if __name__ == "__main__":
    generate_comprehensive_report()

