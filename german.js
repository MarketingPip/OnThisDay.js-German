   
function validateInput(input, SETTINGS) {
  // Check if input has the same key names as the example SETTINGS
  const keys = Object.keys(SETTINGS);
  const inputKeys = Object.keys(input);
  const hasSameKeys = keys.every((key) => inputKeys.includes(key));

  if (!hasSameKeys) {
    throw new Error("Invalid input. Input should have the same keys as the example SETTINGS.");
  }

  // Check if regex_match contains {day} and {month}
  if (!input.regex_match.includes("{day}") || !input.regex_match.includes("{month}")) {
    throw new Error("Invalid regex_match. It should contain both {day} and {month} placeholders.");
  }

  // Check if months array has 12 months
  if (input.months.length !== 12) {
    throw new Error("Invalid months array. It should contain exactly 12 months.");
  }
  
  if (input.lang.length !== 2 || input.lang.length > 2) {
     throw new Error("Invalid language code provided. It should contain only 2 characters. Example: en.");
  }

  // Check if event_sections, birth_sections, and death_sections are arrays with two items that are numbers
  const sectionsKeys = ["event_sections", "birth_sections", "death_sections"];
  sectionsKeys.forEach((key) => {
    const sections = input[key];
    if (typeof sections != "string") {
      throw new Error(`Invalid ${key}. It should be an array with exactly two numbers.`);
    }
  });
  
    // Check if error_msgs has exactly 3 key names
  const errorMsgsKeys = Object.keys(input.error_msgs);
  console.log(errorMsgsKeys.length)
  if (errorMsgsKeys.length !== 3) {
    throw new Error("Invalid error_msgs. It should have exactly 3 key names.");
  }

  // Check if regex key is named correctly
  if (!input.regex || typeof input.regex !== "object" || !(input.regex instanceof RegExp)) {
    throw new Error("Invalid regex. It should be a regular expression object.");
  }
  
  
}


import wtf from "https://cdn.skypack.dev/wtf_wikipedia@10.1.5";

/**
 * Split the event text and remove any bracketed content.
 * @param {string} text - The event text to split.
 * @returns {string} - The cleaned event text.
 */
function splitEventText(eventText, regPattern) {
    eventText = eventText.replace(/\s+/g, ' ').trim();
 
    const regex = regPattern
    const match = eventText.match(regex);

    if (match && parseInt(match[1])) {
      
        const year = parseInt(match[1]);
        const event = match[2].trim();
        return {
            year,
            event
        };
    } else {
        return null; // Invalid format, return null or handle error accordingly
    }
}


/**
 * Fetches data from Wikipedia for the specified date.
 * @param {string} input - The date to find events for. If not provided will return by default events for current date.
 * @returns {Promise<{getEvents: Function, getBirths: Function, getDeaths: Function, getEvents: string[], getBirths: string[], getDeaths: string[], getAll: string[]}>} - A Promise that resolves to an object containing data and methods to retrieve specific data.
 * @throws {Error} - If there is an error fetching data from Wikipedia.
 */
export async function OnThisDay(input = null, langPlugin = null) {
   let SETTINGS = {
  regex:/^(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b) (\d{1,2})$/,
       parsing_regex:/^(?:\* )?(\d{1}|\d{2}|\d{3}|\d{4}) – (.*)$/,
       regex_match:"{month}_{day}",
       lang:"en",
       months:['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
       event_sections:[2,4], 
       birth_sections:[6,8],
       death_sections:[6,8],
       error_msgs:{fetch:`Error fetching events from Wikipedia. {error}`,
                   invalid_input:`Invalid input. Please provide a valid month and day (e.g., "July 16").`,
                   nothing_found:"Nothing found for provided date.",
                  }
      }//
        
  
  try {
      
  
      let match;
     
      
      if(langPlugin){
        try {
  validateInput(langPlugin, SETTINGS);
 SETTINGS = langPlugin
} catch (error) {
 throw new Error(error.message);
}

      }
      
      
        /// If input was provided - set date.    
        if (input) {
            const regex = SETTINGS.regex
             match = input.match(regex);
            if (!match) {
                throw new Error('Invalid input. Please provide a valid month and day (e.g., "July 16").');
            }
            if (match) {
           
              SETTINGS.regex_match = SETTINGS.regex_match.replace("{month}", match[1])
              
                SETTINGS.regex_match = SETTINGS.regex_match.replace("{day}", match[2])
              
                input = `${SETTINGS.regex_match}`
            }
        }


        /// GET DATE IF NONE PROVIDED
        let date = new Date();

        function getMonth() {
            const months = SETTINGS.months;
            return months[date.getMonth()];
        }


        /// Date input was provided - setting date to current date.     
        if (!input) {
          
          SETTINGS.regex_match = SETTINGS.regex_match.replace("{month}", getMonth())
              
                SETTINGS.regex_match = SETTINGS.regex_match.replace("{day}", date.getDate() )
              
                input = `${SETTINGS.regex_match}`
          
         
        }


        let doc = await wtf.fetch(input, SETTINGS.lang);

        let sections = doc?.sections();
       
       if(!sections){
         throw new Error("Nothing found for provided date.")
       }
        
        const data = {
            date: doc.title(),
            events: [],
            births: [],
            deaths: []
        };


      const historySectionIndex = doc.sections().findIndex((section) =>
      section._title.toLowerCase().includes(SETTINGS.event_sections)
    );

    
        const historySection = doc.sections()[historySectionIndex];
   
    let text = []
  
text.push(historySection.text())

    for (let i = 0; i <= historySection.children().length; i++) {   if(historySection.children()[i]?.text()){
     text.push(historySection.children()[i]?.text())
    }
   }
  
        /// GET EVENTS
        for (let i in text) {
          const sectionText = text[i]
         data.events.push(...text[i].split('\n').map((event) => splitEventText(event, SETTINGS.parsing_regex)).filter(Boolean));
        }

    
    
    let parsing_regex = SETTINGS.parsing_regex  
    
          if(SETTINGS.born_on_page){
        
            if(match){
           SETTINGS.born_on_page = SETTINGS.born_on_page.replace("{month}", match[1])
              
                SETTINGS.born_on_page = SETTINGS.born_on_page.replace("{day}", match[2] )
           }
    
               if(!match){
                     SETTINGS.born_on_page= SETTINGS.born_on_page.replace("{month}", getMonth())
              
                SETTINGS.born_on_page = SETTINGS.born_on_page.replace("{day}", date.getDate() )  
                }
            
            
              doc = await wtf.fetch(SETTINGS.born_on_page, SETTINGS.lang);

       sections = doc?.sections();
            
     
       if(SETTINGS.born_on_page_regex){
        SETTINGS.parsing_regex = SETTINGS.born_on_page_regex 
       }     
      
       if(!sections){
         throw new Error("Nothing found for born on page.")
       }
                  
      }
    
        /// GET BIRTHS 
        for (let i = parseInt(SETTINGS.birth_sections[0]); i <=  parseInt(SETTINGS.birth_sections[1]); i++) {
         
           const sectionText = sections[i]?.text()?.trim();
          if(sectionText){
         data.births.push(...sectionText.split('\n').map((event) => splitEventText(event, SETTINGS.parsing_regex)).filter(Boolean));
          }
        }

    
    
    
    
    
              if(SETTINGS.death_page){
        
                if(match){
           SETTINGS.death_page = SETTINGS.death_page.replace("{month}", match[1])
              
                SETTINGS.death_page = SETTINGS.death_page.replace("{day}", match[2] )
                }    
                
                if(!match){
                     SETTINGS.death_page = SETTINGS.death_page.replace("{month}", getMonth())
              
                SETTINGS.death_page = SETTINGS.death_page.replace("{day}", date.getDate() )  
                }
        
              doc = await wtf.fetch(SETTINGS.death_page, SETTINGS.lang);

       sections = doc?.sections();
       
       if(!sections){
         throw new Error("Nothing found for deaths page.")
       }
                
         // Revert to default parsing regex pattern.       
         SETTINGS.parsing_regex = parsing_regex       
       
             if(SETTINGS.death_page_regex){
        SETTINGS.parsing_regex = SETTINGS.death_page_regex
       }             
                
      }
    
    
    
        /// GET DEATHS 
        for (let i = parseInt(SETTINGS.death_sections[0]); i <= parseInt(SETTINGS.death_sections[1]); i++) {
          const sectionText = sections[i]?.text()?.trim();
           if(sectionText){
           data.deaths.push(...sectionText.split('\n').map((event) => splitEventText(event, SETTINGS.parsing_regex)).filter(Boolean));
           }
        }

        /**
         * @typedef {Object} GetDataMethods
         * @property {Function} getEvents - Returns the array of event data.
         * @property {Function} getBirths - Returns the array of birth data.
         * @property {Function} getDeaths - Returns the array of death data.
         * @property {Function} getAll - Returns the array of event, birth & death data.
         */

        /**
         * Returns an object containing data and methods to retrieve specific data.
         * @type {GetDataMethods & {events: string[], births: string[], deaths: string[], all: string[]}}
         */
      
     
      
        const getDataMethods = {
            getEvents: () => data.events,
            getBirths: () => data.births,
            getDeaths: () => data.deaths,
            getAll: () => data
        };

        return Object.assign(getDataMethods, data);
    } catch (err) {
      SETTINGS.error =  SETTINGS.error_msgs.fetch.replace("{error}", err.message) 
        throw new Error(SETTINGS.error);
    }
}
//

let SETTINGS = {
  regex:/^(\b(?:Januar|Februar|marzo|April|Mai|Juni|Juli|agosto|September|Oktober|November|dicembre)\b) (\d{1,2})$/,
      parsing_regex: /(?:\* )?(.*) – (.*)/,
       regex_match:"{day}_{month}",
       lang:"it",
       months:['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
       event_sections:"eventi", 
       birth_sections:"Null",
       death_sections:"Null",
    born_on_page: "Nati_il_{day}_{month}",
    born_on_page_regex:  /^(?:\* )?(.*) - (.*)$/,
  death_page: "Morti_il_{day}_{month}",
 death_page_regex:  /^(?:\* )?(.*) - (.*)$/, 
       error_msgs:{fetch:`Errore durante il recupero degli eventi da: {error}`,
                   invalid_input:`Inserimento non valido. Fornisci un mese e un giorno validi (ad es. "luglio 16")`,
                   nothing_found:"Non è stato trovato nulla per le date fornite.",
                  }
      }

try{
let tt = await OnThisDay("dicembre 25", SETTINGS)
console.log(tt.getEvents())
}catch(error){
  console.log(error.message)
}
