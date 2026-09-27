(function(){
  const Q=window.PSR_QUESTIONS;
  if(!Q)return;
  const routines=[
    ['She ___ breakfast at seven.','has',['have','has','having']],['He ___ to school by bus.','goes',['go','goes','going']],['I ___ my homework after dinner.','do',['do','does','doing']],['They ___ football on Fridays.','play',['play','plays','playing']],
    ['My brother ___ TV after school.','watches',['watch','watches','watching']],['We ___ English on Mondays.','study',['study','studies','studying']],['Anna ___ her teeth every morning.','brushes',['brush','brushes','brushing']],['Tom ___ up at 6 a.m.','wakes',['wake','wakes','waking']],
    ['She ___ a shower before school.','takes',['take','takes','taking']],['He ___ coffee every morning.','drinks',['drink','drinks','drinking']],['I ___ my backpack before class.','check',['check','checks','checking']],['They ___ lunch at home.','have',['have','has','having']],
    ['My dad ___ home at five.','arrives',['arrive','arrives','arriving']],['She ___ her uniform at 7.','wears',['wear','wears','wearing']],['He ___ his books in his bag.','puts',['put','puts','putting']],['We ___ to bed at ten.','go',['go','goes','going']]
  ];
  const questionStarts=[
    ['Do / you / like / football / ?','Do you like football ?'],['Do / they / watch / TV / ?','Do they watch TV ?'],['Does / she / study / Science / ?','Does she study Science ?'],['Does / he / play / basketball / ?','Does he play basketball ?'],
    ['What / do / you / do / after school / ?','What do you do after school ?'],['When / does / she / wake / up / ?','When does she wake up ?'],['What / subject / does / he / like / ?','What subject does he like ?'],['Does / your / friend / like / anime / ?','Does your friend like anime ?'],
    ['Do / you / play / sports / on Sunday / ?','Do you play sports on Sunday ?'],['Does / she / love / movies / ?','Does she love movies ?'],['What time / do / they / go / to school / ?','What time do they go to school ?'],['When / does / he / watch / TV / ?','When does he watch TV ?']
  ];
  const toxic=[
    ['She usually ___ English.','studies',['study','studies','studying']],['He never ___ horror movies.','watches',['watch','watches','watching']],['I often ___ football after school.','play',['play','plays','playing']],['My sister ___ boring classes.','hates',['hate','hates','hating']],
    ['We sometimes ___ basketball.','play',['play','plays','playing']],['She always ___ her uniform.','wears',['wear','wears','wearing']],['He usually ___ TV at night.','watches',['watch','watches','watching']],['They often ___ Science.','study',['study','studies','studying']],
    ['I never ___ late for school.','arrive',['arrive','arrives','arriving']],['My friend ___ Math because it is difficult.','hates',['hate','hates','hating']],['She loves ___ movies.','watching',['watch','watches','watching']],['He likes ___ football.','playing',['play','plays','playing']]
  ];
  Q.farm.routine.push(...routines);
  Q.farm.question.push(...questionStarts);
  Q.farm.toxic.push(...toxic);

  const bombSubjects=['SHE','HE','ANNA','MY DAD','MY SISTER','TOM','JULIA','THE BOY','THE GIRL','MY FRIEND'];
  const bombVerbs=[['play','plays','playing','plaied','plays'],['watch','watches','watching','watchs','watches'],['study','studies','studying','studys','studies'],['go','goes','going','goed','goes'],['have','has','having','haves','has'],['do','does','doing','dos','does'],['take','takes','taking','taked','takes'],['brush','brushes','brushing','brushs','brushes']];
  bombSubjects.forEach((s,i)=>{const v=bombVerbs[i%bombVerbs.length];Q.mini.bomb.push([s,[v[0],v[1],v[2],v[3]],v[4]])});

  const puzzleTemplates=[
    ['She usually watches TV at night.',['She','usually','watches','TV','at','night','.']],
    ['I always do my homework after school.',['I','always','do','my','homework','after','school','.']],
    ['They often play football on Sunday.',['They','often','play','football','on','Sunday','.']],
    ['He never watches horror movies.',['He','never','watches','horror','movies','.']],
    ['Do you like Science at school?',['Do','you','like','Science','at','school','?']],
    ['Does she love comedy shows?',['Does','she','love','comedy','shows','?']],
    ['What do you do in your free time?',['What','do','you','do','in','your','free','time','?']],
    ['When does he play basketball?',['When','does','he','play','basketball','?']],
    ['My brother studies Math every day.',['My','brother','studies','Math','every','day','.']],
    ['We usually go home by bus.',['We','usually','go','home','by','bus','.']]
  ];
  Q.mini.puzzle.push(...puzzleTemplates);

  const dilemmas=[
    ['She ___ to school every day.',['go','goes','going'],'goes'],['He ___ TV after dinner.',['watch','watches','watching'],'watches'],['They ___ football on Friday.',['play','plays','playing'],'play'],
    ['___ you like movies?',['Do','Does','Is'],'Do'],['___ she study English?',['Do','Does','Are'],'Does'],['I ___ usually late.',['am','is','are'],'am'],['My friends ___ often play basketball.',['do','does','is'],'do'],['What ___ he do after school?',['do','does','is'],'does'],
    ['She ___ wearing jeans.',['like','likes','liking'],'likes'],['He ___ boring subjects.',['hate','hates','hating'],'hates'],['We ___ Science on Monday.',['study','studies','studying'],'study'],['My sister ___ a shower every morning.',['take','takes','taking'],'takes']
  ];
  Q.mini.dilemma.push(...dilemmas);

  const sky1=[['She ___ to school at 7.','goes'],['I ___ up early on Monday.','wake'],['He ___ his teeth before bed.','brushes'],['They ___ lunch at home.','have'],['My dad ___ coffee in the morning.','drinks']];
  const sky2=[['He ___ plays football.','never'],['I ___ study after dinner.','usually'],['She ___ watches TV on Friday.','always'],['They ___ go swimming on Sunday.','often'],['We ___ eat pizza.','sometimes']];
  const sky3=[['___ you like horror movies?','Do'],['___ she study Science?','Does'],['___ they play football?','Do'],['___ he watch TV at night?','Does'],['___ you do homework after school?','Do']];
  const sky4=[['She ___ wearing jeans.','hates'],['He ___ horror movies.','loves'],['She ___ Math because it is boring.','hates'],['I ___ watching comedy shows.','like'],['He ___ playing football.','loves']];
  Q.skyfall[1].push(...sky1);Q.skyfall[2].push(...sky2);Q.skyfall[3].push(...sky3);Q.skyfall[4].push(...sky4);
})();
