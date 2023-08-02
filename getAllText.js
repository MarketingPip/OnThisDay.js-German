import wtf from "https://cdn.skypack.dev/wtf_wikipedia@10.1.5"

 
async function checkSectionHistory(doc) {
  try {
    if (!doc || !doc.sections) {
      throw new Error("Invalid Wikipedia document provided.");
    }
    
   

 
    
     const historySectionIndex = doc.sections()
    
        const historySection = doc.sections()
   
    let text = []
  

   
for (let i = 0; i <= historySection.length; i++) {
  if( historySection[i]?.text()){
     text+= historySection[i]?.text()
  }
   }
    return text
    
  } catch (error) {
    console.error("Error while checking History section:", error.message);
  }
}
//
wtf.fetch("Morti_il_6_marzo", "it", async function (err, doc) {
  if (!err) {
    console.log(await checkSectionHistory(doc));
  } else {
    console.error("Error fetching data:", err);
  }
});
