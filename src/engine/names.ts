const firstNames = [
  // Classic American
  'James','Kevin','LeBron','Stephen','Kawhi','Anthony','Damian','Jayson','Luka','Giannis',
  'Joel','Nikola','Devin','Trae','Zion','Ja','Tyrese','Cade','Evan','Marcus',
  'Tyler','Chris','Paul','Andre','Draymond','Klay','Rudy','Bam','Jimmy','Kyle',
  'John','Bradley','Khris','Brook','Spencer','De\'Aaron','Darius','Franz','Scottie',
  'Miles','Pascal','Fred','Gary','Terrence','Jordan','Jaren','Desmond','Aaron',
  'Shai','Isaiah','Kemba','Mike','Al','Taj','Derrick','Eric','Lou','Reggie',
  'Tony','Victor','Tobias','Jalen','Alperen','Amen','Ausar','Brandon','Scoot','Chet',
  'Paolo','Jabari','Jaden','Dyson','Rui','Deni','Kristaps','Serge','Nerlens','Clint',
  'Mason','Norman','Danny','Donte','Malik','Terance','Shake','Immanuel','Luguentz',
  'Josh','Jonathan','Jaylen','Grant','Kelly','Montrezl','Thaddeus','Precious','OG',
  'Bogdan','Aleksej','Ivica','Lauri','Jusuf','Nikola','Patty','Furkan',
  // African / West African
  'Goga','Bismack','Cheick','Moussa','Hamidou','Sekou','Boubacar','Mamadi','Kofi',
  'Trayce','Saddiq','Killian','Ousmane','Ibou','Bol','Marial','Dario','Naz',
  // European
  'Luca','Aleksa','Danilo','Bojan','Vladimir','Stefan','Marko','Sasha','Ante','Bojan',
  'Goran','Zach','Jonas','Mindaugas','Domantas','Rokas','Ignas','Keit','Arnoldas',
  'Anzejs','Kristaps','Davis','Janis','Rodions','Arturs','Raivis',
  'Franz','Moritz','Isaiah','Mo','Oscar','Leandro','Yuta','Rui','Killian',
  'Vlatko','Bojan','Dragan','Nemanja','Nikola','Bogdan','Ognjen',
  'Nicolas','Evan','Frank','Timothe','Théo','Killian','Olivier','Joakim',
  // Latin / Brazilian
  'Bruno','Lucas','Gui','Leandro','Anderson','Raulzinho','Rafael','Cristiano','Alex',
  'Carlos','Diego','Raul','Marco','Miguel','Santiago','Matias','Emilio','Luis','Jose',
  // Australian
  'Ben','Patty','Josh','Jock','Thon','Dante','Matthew','Ryan','Jonah','Jack',
  // More American variety
  'Tre','Dru','D\'Angelo','De\'Anthony','O\'Shea','Lonnie','Keon','Vit','Isaiah',
  'Keyonte','Colby','Jordan','Ochai','Keegan','Gradey','Brandin','GG','Jordan',
  'Jaylin','Nate','Dalen','Tristan','Kira','Cason','Jordan','Javonte','JD',
  'Tre','Xavier','Obi','Jerami','Keldon','Stanley','Jrue','Gary','KJ',
  'Kenyon','Caleb','Jake','Patrick','Sam','Devon','Seth','Duncan','Chris','Will',
  'Bobby','Lance','Otto','Dillon','Kevin','Nate','Shake','Luke','Cody','Tom',
  'Brook','Robin','Aaron','David','Cameron','Cole','Dean','Darius','Devonte',
  'Quentin','Torrey','Delon','Jordan','P.J.','T.J.','C.J.','D.J.','A.J.','J.J.',
];

const lastNames = [
  // Common American
  'Johnson','Williams','Smith','Brown','Jones','Davis','Miller','Wilson','Moore','Taylor',
  'Anderson','Thomas','Jackson','White','Harris','Martin','Garcia','Thompson','Martinez','Robinson',
  'Clark','Rodriguez','Lewis','Lee','Walker','Hall','Allen','Young','Hernandez','King',
  'Wright','Lopez','Hill','Scott','Green','Adams','Baker','Gonzalez','Nelson','Carter',
  'Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins',
  'Stewart','Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey',
  'Rivera','Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson','Gray','Ramirez',
  'Watson','Brooks','Kelly','Sanders','Price','Bennett','Wood','Barnes','Ross',
  'Henderson','Coleman','Jenkins','Perry','Powell','Long','Patterson','Hughes','Flores','Washington',
  'Butler','Simmons','Foster','Bryant','Alexander','Russell','Griffin','Diaz','Hayes',
  'James','Porter','Murray','George','Leonard','Booker','Young','Morant','Doncic','Embiid',
  'Jokic','Lillard','Tatum','Durant','Irving','Curry','Thompson','Green','Butler',
  'Holiday','Mitchell','Beal','Harden','Paul','Westbrook','DeRozan','LaVine','Ball',
  // European surnames
  'Antetokounmpo','Gobert','Siakam','Nunn','Sabonis','Valanciunas','Kleiza',
  'Porzingis','Bertans','Kurucs','Wiltjer','Markkanen','Nurkic','Bogdanovic',
  'Bjelica','Jokic','Milutinov','Micic','Teodosic','Vesely','Satoransky',
  'Heurtel','De Colo','Fournier','Ntilikina','Batum','Gobert','Poirier',
  'Schroder','Wagner','Theis','Hartenstein','Kleber','Nowitzki','Dirk',
  'Goga','Bitadze','Zubac','Saric','Chriss','Kabengele','Nnaji',
  'Vonleh','Nwaba','Nwora','Nwachukwu','Iwundu','Metu','Usman',
  // African / diaspora
  'Diallo','Coulibaly','Traore','Dieng','Mbaye','Ndoye','Sarr','Fall','Gueye','Ndiaye',
  'Sissoko','Camara','Bah','Kouyate','Koulibaly','Doumbia','Keita','Diakite','Soumah',
  'Okafor','Obi','Eze','Chukwuemeka','Okeke','Aminu','Ayton','Okongwu','Onyeka',
  'Bamba','Bagayoko','Kourouma','Diabate','Konate','Toure','Dembele','Kone',
  // Latin
  'Hernandez','Reyes','Cruz','Morales','Ortiz','Jimenez','Vargas','Castillo','Romero','Delgado',
  'Vidal','Rojas','Flores','Mendoza','Aguilar','Medina','Estrada','Guerrero','Lara','Campos',
  // Australian
  'Bogut','Ingles','Dellavedova','Exum','Mills','Baynes','Goulding','Creek','Penney',
  // More variety
  'Quickley','Maxey','Cunningham','Garland','Sexton','Reddish','Clarke','Hunter',
  'Okoro','Mobley','Evan','Love','Nance','Allen','LeVert','Wade','Conley',
  'Gobert','O\'Neale','Clarkson','Agbaji','Ochai','Kessler','Sensabaugh',
  'Wiggins','Poole','Kuminga','Moody','Wiseman','DiVincenzo','Looney',
  'Powell','Simons','Sharpe','Thybulle','Camara','Keon','Little',
  'Clarke','Memphis','Konchar','Bane','Brooks','Aldama','Kennedy',
  'Murphy','Ingram','McCollum','Nance','Jones','Temple','Hawes',
  'Johnson','Sochan','Collins','Vassell','McDermott','Primo','Champagnie',
];

export function randomName(rng: () => number): string {
  const f = firstNames[Math.floor(rng() * firstNames.length)];
  const l = lastNames[Math.floor(rng() * lastNames.length)];
  return `${f} ${l}`;
}
