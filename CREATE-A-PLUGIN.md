# Create a Plugin

To create a plugin for adding language support to OnThisDay.js, you need to create a configuration object that contains the necessary information for parsing dates and extracting relevant data from Wikipedia. This configuration object allows you to specify the regular expression for date matching, the language code, the month names, and the section indices for events, births, and deaths on the Wikipedia page.

Here's a step-by-step guide on creating the configuration object:

1. input_regex: This is a regular expression used to match and extract the date from the input string. The regular expression should have two capturing groups for the month and the day. For example, the regex for English (default language) is <b>/^(\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b) (\d{1,2})$/</b>, and for German, it would be <b>/^(\b(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b) (\d{1,2})$/</b>.

2. parsing_regex:This is a regular expression used to match and extract the year & event from Wikipedia. The regular expression should have two capturing groups for the year and the event. For example, the regex for English is <b>/^(?:\* )?(.*) – (.*)$/</b> which will match the format of the English Wikipedia ```1277 – The University of Paris issues the last in a series of condemnations of various philosophical and theological theses.```. Different Wikipedia language's might use different formats. For example, this is a German format Wiki event ```1516: Doge Cristoforo Moro weist den in der Republik Venedig lebenden Juden das Gheto novo in Cannaregio als Wohnort zu.```. Which we will need to adjust to regex for the German Wiki format - <b>/^(?:\* )?(.*): (.*)$/</b> 

3. wiki_url: This string is used to construct the Wikipedia URL for fetching data. It should contain placeholders {day} and {month} to be replaced with the day and month extracted from the input string. For example, for English, the regex_match is ```{month}_{day}``` which represents ```https://en.wikipedia.org/wiki/{month}_{day}```. For German, it would be ```{day}._{month}``` which would represent ```https://de.wikipedia.org/wiki/{day}._{month}```.

4. lang: This is the language code for the Wikipedia pages you want to fetch data from. For example, for French Wikipedia, use "fr", and for German Wikipedia, use "de".

5. months: This is an array containing the names of all 12 months in the specified language. The order of the months in the array should match the order used in the regular expression.

6. event_sections, birth_sections, death_sections: These are arrays with two numeric values each, representing the section indices for events, births, and deaths on the Wikipedia page. The first value indicates the starting section index, and the second value indicates the ending section index. For example, if events are listed in sections 7 to 9 on the Wikipedia page, you would set event_sections: [6, 8].

7. error_msgs: This object contains error messages to be displayed in case of errors or invalid inputs. It should have the following keys:

   fetch: Error message when there is an issue fetching events from Wikipedia.
   
   invalid_input: Error message for invalid input (e.g., incorrect date format).
   
   nothing_found: Error message when there are no events found for the provided date.
   
Once you have created the configuration object, you can pass it as the second argument to the OnThisDay function to retrieve events, births, and deaths in the specified language. For example:

```javascript
const german = {
  input_regex: /^(\b(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b) (\d{1,2})$/,
  parsing_regex: /^(?:\* )?(.*): (.*)$/,
  wiki_url: "{day}._{month}",
  lang: "de",
  months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  event_sections: [6, 8],
  birth_sections: [6, 8],
  death_sections: [6, 8],
  error_msgs: {
    fetch: "Error fetching events from Wikipedia. {error}",
    invalid_input: "Invalid input. Please provide a valid month and day (e.g., 'July 16').",
    nothing_found: "Nothing found for the provided date.",
  }
};

// Example usage for German Wikipedia:
const germanData = OnThisDay("July 1", german);
console.log(germanData);
```

With this example configuration, OnThisDay.js will be able to fetch events from the German Wikipedia, parse the date correctly using the specified regular expression and month names, and provide the relevant data in the desired language.

Feel free to share your configurations with the community by sending a PR to the repo! 

If you have any questions - feel free to open a issue & ask!
