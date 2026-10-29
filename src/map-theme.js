// One palette for the canvas, location tips, legend and sidebar selection.
export const mapTheme={
 water:'#eef3f7',land:'#e3ebe6',provinceBorder:'#82988e',countyBorder:'#98ada2',text:'#526960',
 selectedFill:'#c0ded4',selectedInk:'#245f57',selectedRow:'#e8f2ee',
 tipBackground:'#263b4d',tipBorder:'#ffffff',tipText:'#ffffff',tipSelectedBackground:'#075e54',tipSelectedBorder:'#f5cd73',tipHalo:'#f5f8f5'
};
export const mapPalette=[
 {ink:'#2c7068',fill:'#c9e2db'},
 {ink:'#426e91',fill:'#d2e2ef'},
 {ink:'#507680',fill:'#d4e4e7'},
 {ink:'#627d57',fill:'#dce6d3'},
 {ink:'#77618c',fill:'#e1daec'},
 {ink:'#92704b',fill:'#ece0cf'}
];
export const mapColors=mapPalette.map(color=>color.ink);
