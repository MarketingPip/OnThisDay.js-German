   
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
    if (!Array.isArray(sections) || sections.length !== 2 || !sections.every((item) => typeof item === "number")) {
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

    if (match) {
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
export async function OnThisDay(input, langPlugin = null) {
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


        const doc = await wtf.fetch(input, SETTINGS.lang);

        const sections = doc?.sections();
        console.log(sections)
       if(!sections){
         throw new Error("Nothing found for provided date.")
       }
        
        const data = {
            date: doc.title(),
            events: [],
            births: [],
            deaths: []
        };


        /// GET EVENTS
        for (let i = parseInt(SETTINGS.event_sections[0]); i <= parseInt(SETTINGS.event_sections[1]); i++) {
            const sectionText = sections[i].text().trim();
           data.events.push(...sectionText.split('\n').map((event) => splitEventText(event, SETTINGS.parsing_regex)).filter(Boolean));
        }

        /// GET BIRTHS 
        for (let i = 6; i <= 8; i++) {
            const sectionText = sections[i].text().trim();
           // data.births.push(...sectionText.split('\n').map((event) => splitEventText(event, SETTINGS.parsing_regex)).filter(Boolean));
        }

        /// GET DEATHS 
        for (let i = 10; i <= 12; i++) {
            const sectionText = sections[i].text().trim();
            //data.deaths.push(...sectionText.split('\n').map((event) => splitEventText(event, SETTINGS.parsing_regex)).filter(Boolean));
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


let SETTINGS = {
  regex:/^(\b(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b) (\d{1,2})$/,
      parsing_regex: /^(?:\* )?(.*):(.*)$/,
       regex_match:"{day}._{month}",
       lang:"de",
       months:['January', 'February', 'March', 'April', 'May', 'June', 'Juli', 'August', 'September', 'October', 'November', 'December'],
       event_sections:[1,9], 
       birth_sections:[1,9],
       death_sections:[1,9],
       error_msgs:{fetch:`Error fetching events from Wikipedia. {error}`,
                   invalid_input:`Invalid input. Please provide a valid month and day (e.g., "July 16").`,
                   nothing_found:"Nothing found for provided date.",
                  }
      }

try{
let tt = await OnThisDay("Juli 23", SETTINGS)
console.log(tt)
}catch(error){
  console.log(error.message)
}
