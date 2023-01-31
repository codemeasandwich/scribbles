const scribbles = require('../index');
const sample1 = require('./sample1');
const sample2 = require('./sample2');

//=====================================================
//======================================
//=====================================================


describe('.config(...)', () => {
  it('should allow setting global', () => {
    scribbles.config({global:"console"})
    console.log('HelloWorld')
    scribbles.config.reset()
})

describe('.status( .?. )', () => {
  it('+', () => {

  })
})


describe('check defaults', () => {
  it('level output to console', () => {

    const globalDate = Date;
    const mockDate = new Date('14 Oct 1995')
    global.Date = jest.fn().mockImplementation(() => mockDate) // mock Date "new" constructor

    config.levels.forEach(level=>{
      const cl = console[level]
      console[level] = (scribblesOutput)=>{
        expect(scribblesOutput).toMatchSnapshot();
      }
      scribbles[level]('HelloWorld');
      console[level] = cl
    })
    global.Date = globalDate

  })
})
