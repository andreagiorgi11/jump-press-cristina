import {readFile} from 'node:fs/promises';
import {rgb} from 'pdf-lib';
export const pdfTheme={ink:rgb(21/255,21/255,21/255),grey:rgb(.40,.40,.40),red:rgb(1,40/255,80/255),yellow:rgb(223/255,1,47/255),paper:rgb(.96,.96,.96),border:rgb(.87,.87,.87),white:rgb(1,1,1)};
export async function loadPdfFonts(){return {regular:await readFile(process.cwd()+'/public/brand/fonts/roboto-regular.ttf'),heading:await readFile(process.cwd()+'/public/brand/fonts/juventus-fans-bold.ttf')};}
