const v = process.version.split('.');
const ver = +(v[0].slice(1))
const fe = +v[1];
const bug = +v[2];
if(8 > ver
|| 8 === ver && 5 > fe){
  throw new Error("Scribbles needs node v8.5.0 or higher. You are running "+process.version)
}
