/**!
 * @license OnThisDay.js - A JavaScript library to find out what events happened today or any day in history.
 * VERSION: 1.0.1
 * CREATED BY: Jared Van Valkengoed
 * LICENSED UNDER MIT LICENSE
 * MORE INFO CAN BE FOUND AT https://github.com/MarketingPipeline/OnThisDay.js/
 */


import wtf from "https://cdn.skypack.dev/wtf_wikipedia@10.1.5";

/**
 * Split the event text and remove any bracketed content.
 * @param {string} text - The event text to split.
 * @returns {string} - The cleaned event text.
 */
function splitEventText(eventText) {
    eventText = eventText.replace(/\s+/g, ' ').trim();
    const regex = /^(?:\* )?(\d{1}|\d{2}|\d{3}|\d{4}) – (.*)$/;
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
       regex:/^(\b(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b) (\d{1,2})$/,
       regex_match:"{match1} {match2}",
       lang:"en",
       months:['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
       event_sections:[6,8], 
       birth_sections:[6,8],
       death_sections:[6,8],
       invalid_input_error:'Invalid input. Please provide a valid month and day (e.g., "July 16").',
       error:`Error fetching events from Wikipedia. {error}`
      }
      
  
    try {
      
  
      let match;
     
      
      if(langPlugin){
        SETTINGS = langPlugin
      }
      
      
        /// If input was provided - set date.    
        if (input) {
            const regex = SETTINGS.regex
             match = input.match(regex);
            if (!match) {
                throw new Error(SETTINGS.invalid_input_error);
            }
            if (match) {
              SETTINGS.regex_match = SETTINGS.regex_match.replace("{match1}", match[1])
              
                SETTINGS.regex_match = SETTINGS.regex_match.replace("{match2}", match[2])
              
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
            input = `${getMonth()} ${date.getDate()}`
        }


        const doc = await wtf.fetch(input, SETTINGS.lang);

        const sections = doc.sections();

        const data = {
            date: doc.title(),
            events: [],
            births: [],
            deaths: []
        };


        /// GET EVENTS
        for (let i = 2; i <= 4; i++) {
            const sectionText = sections[i].text().trim();
          console.log(sectionText)
            data.events.push(...sectionText.split('\n').map(splitEventText));
        }

        /// GET BIRTHS 
        for (let i = 6; i <= 8; i++) {
            const sectionText = sections[i].text().trim();
            data.births.push(...sectionText.split('\n').map(splitEventText));
        }

        /// GET DEATHS 
        for (let i = 10; i <= 12; i++) {
            const sectionText = sections[i].text().trim();
            data.deaths.push(...sectionText.split('\n').map(splitEventText));
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
      SETTINGS.error =  SETTINGS.error.replace("{error}", err.message) 
        throw new Error(SETTINGS.error);
    }
}
let tt = await OnThisDay()
console.log(tt)
// Notes to self - section counts are different so is parsing uses : instead of - in events. 
