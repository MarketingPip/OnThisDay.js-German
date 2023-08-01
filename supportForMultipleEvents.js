function splitEventText(eventText) {
  const events = [];
  const regex = /(\d{4})\s-*/g;
  const matches = [...eventText.matchAll(regex)];

  for (let i = 0; i < matches.length; i++) {
    const year = matches[i][1];
    let description = eventText
      .split("\n")
      .filter((part) => part.trim() !== "")
      .map((part) => part.trim());
   
    if(description[0].includes(`${year} -`)){
     description = description[0].replace(`${year} -`, "").trim()
    }
 
    if(description != year){
    events.push({ year, description });
    }
  }

  return events;
}

let tt = `1992
The " Michelangelo " computer virus begins infecting computers
The new municipality of Fiumicino is established`

console.log(splitEventText(tt))
