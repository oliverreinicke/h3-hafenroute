/* Fictional everyday encounters: one shuffled deck across the entire city. */
window.H3Chats = (() => {
  'use strict';
  const lines = [
    {id:'00',question:'Sind Sie auch zu einem Termin unterwegs?',text:'Ja, nachher habe ich einen Termin. Diesmal habe ich die Abholzeit gleich neben die Terminzeit geschrieben, sonst verwechsle ich das in der Eile.'},
    {id:'01',question:'Ist heute alles dabei?',text:'Fast wäre meine Lesebrille zu Hause geblieben. Zum Glück liegt sie jetzt zusammen mit der Terminbestätigung in meiner kleinen Tasche.'},
    {id:'02',question:'Wie kommen Sie nachher wieder nach Hause?',text:'Meine Rückfahrt ist schon abgesprochen. Falls der Termin länger dauert, rufe ich dort an, statt einfach an einem anderen Ort zu warten.'},
    {id:'03',question:'Warten Sie auf jemanden?',text:'Auf meine Schwester, wir fahren heute gemeinsam los. Wir haben vorher abgemacht, wer mich begleitet und wo wir uns treffen, dann muss niemand suchen.'},
    {id:'04',question:'Sie sehen gut vorbereitet aus.',text:'Heute nehmen wir einen Faltrollstuhl mit. Ich habe beim Fahrdienst extra nachgefragt, ob er in dieses Fahrzeug passt; am Telefon war das schnell geklärt.'},
    {id:'05',question:'Ist die Fahrt schon organisiert?',text:'Für meinen Nachbarn haben wir vorher nach einem Fahrzeug gefragt, in dem er in seinem Rollstuhl mitfahren kann. Das wollte ich lieber in Ruhe klären als erst bei der Abholung.'},
    {id:'06',question:'Sind Sie schon lange unterwegs?',text:'Ich bin etwas früher los, weil hier gerade eine Baustelle ist. Beim letzten Mal habe ich den Eingang gesucht und bin unnötig hektisch geworden.'},
    {id:'07',question:'War die Organisation aufwendig?',text:'Ein paar Anrufe waren es schon. Vor allem wollte ich vorher wissen, was diese konkrete Fahrt kostet und wer die Rechnung bekommt.'},
    {id:'08',question:'Ist das eine grosse Reisetasche?',text:'Nein, nur die Dinge, die ich heute brauche. Die warme Jacke trage ich gleich, und die kleine Tasche bleibt bei mir.'},
    {id:'09',question:'Haben Sie Ihre Unterlagen gefunden?',text:'Ja, sie stecken in einer geschlossenen Mappe. Früher hatte ich immer lose Zettel dabei, und beim Aussteigen rutschte prompt einer zwischen die Sitze.'},
    {id:'10',question:'Gibt es eine Planänderung?',text:'Der Termin hat sich gerade etwas verschoben. Ich sage jetzt dem Fahrdienst Bescheid, damit die Person am Steuer nicht umsonst vor der Tür wartet.'},
    {id:'11',question:'Geht es heute gemeinsam los?',text:'Ja, meine Tochter kommt mit. Wir haben gefragt, ob auch für sie ein Platz vorgesehen ist; zusammen ist die Fahrt für mich entspannter.'},
    {id:'12',question:'Sie schauen so prüfend auf Ihr Telefon.',text:'Ich kontrolliere noch die Adresse und die Telefonnummer für die Abholung. Zwei Gebäude hier haben fast denselben Namen, da lande ich sonst am falschen Eingang.'},
    {id:'13',question:'Hält das Wetter wohl?',text:'Ich hoffe es, aber meine Regenjacke ist dabei. Gestern hat es genau dann angefangen zu schütten, als ich auf den Bus gewartet habe.'},
    {id:'14',question:'Kennen Sie sich hier im Quartier aus?',text:'Inzwischen schon ein bisschen. Am Anfang bin ich immer eine Strasse zu früh abgebogen; der kleine Platz mit dem Brunnen hilft mir jetzt bei der Orientierung.'},
    {id:'15',question:'Waren Sie schon auf dem Markt?',text:'Gerade eben, der Brotstand war schon fast leer. Ich habe noch ein warmes Brot erwischt und muss mich zusammennehmen, damit zu Hause noch etwas davon ankommt.'},
    {id:'16',question:'Haben Sie einen guten Café-Tipp?',text:'Das kleine Café am Quai mag ich sehr. Wenn ich Zeit habe, setze ich mich dort ans Fenster und schaue den Leuten auf dem Platz zu.'},
    {id:'17',question:'Was steht nachher noch an?',text:'Heute Abend gehe ich ins Kino nebenan. Den Film kenne ich noch nicht, aber nach diesem langen Tag freue ich mich schon auf einen ruhigen Sitzplatz.'},
    {id:'18',question:'Ist heute viel los in der Stadt?',text:'Etwas mehr als sonst, finde ich. Wenn die Leute vom Markt zurückkommen, wird es an der Kreuzung immer kurz ziemlich lebhaft.'},
    {id:'19',question:'Sie wirken ziemlich entspannt.',text:'Ich habe heute etwas Zeit zwischen zwei Verabredungen. Sonst renne ich ständig los, ohne vorher nachzuschauen, wie ich eigentlich wieder zurückkomme.'}
  ];
  const profiles = {
    female:['Anita Keller','Miriam Roth','Lea Wenger','Ruth Baumann'],
    male:['Thomas Bachmann','Marco Meier','Samuel Huber','Urs Frei']
  };
  const identities = new Map();
  let deck=[],last=-1;
  function shuffle(){
    deck=lines.map((_,i)=>i);
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    if(deck[0]===last)[deck[0],deck[1]]=[deck[1],deck[0]];
  }
  function identity(id,sex){
    const token=String(id ?? 'visitor')+'|'+sex;
    if(!identities.has(token)){
      const number=Number(id);
      let index=Number.isFinite(number)?Math.floor(Math.abs(number)/2):Array.from(String(id)).reduce((n,c)=>n+c.charCodeAt(0),0);
      identities.set(token,profiles[sex][index%profiles[sex].length]);
    }
    return identities.get(token);
  }
  function next(citizenId,sex='female'){
    sex=sex==='male'?'male':'female';
    if(!deck.length)shuffle();
    last=deck.shift();const line=lines[last];
    return {key:'chat_'+(sex==='male'?'m':'f')+'_'+line.id,name:identity(citizenId,sex),question:line.question,text:line.text,sex};
  }
  const clipKeys=lines.flatMap(line=>['chat_f_'+line.id,'chat_m_'+line.id]);
  return {next,lines,clipKeys};
})();
