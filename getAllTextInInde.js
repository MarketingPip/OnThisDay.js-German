import wtf from "https://cdn.skypack.dev/wtf_wikipedia@10.1.5"

 
async function checkSectionHistory(doc) {
  try {
    if (!doc || !doc.sections) {
      throw new Error("Invalid Wikipedia document provided.");
    }
    
   

 
    
     const historySectionIndex = doc.sections().findIndex((section) =>
      section._title.toLowerCase().includes("events")
    );

    
        const historySection = doc.sections()[historySectionIndex];
   
    let text = []
  
text += historySection.text()
   
for (let i = 0; i <= historySection.children().length; i++) {
     text+= historySection.children()[i]?.text()
   }
    return text
    
  } catch (error) {
    console.error("Error while checking History section:", error.message);
  }
}
//
wtf.fetch("March 12", "en", async function (err, doc) {
  if (!err) {
    console.log(await checkSectionHistory(doc));
  } else {
    console.error("Error fetching data:", err);
  }
});
