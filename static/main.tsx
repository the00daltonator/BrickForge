// Standalone browser build of the studio for static hosting (see vite.static.config.ts).
// Everything runs client-side; server features (saved workspaces, owner AI) are off, and
// files are saved through the host's download capability when one is available.
import {createRoot} from 'react-dom/client';
import '../app/globals.css';
import Home from '../app/page';

type Downloads={save:(r:{filename:string;data:Blob})=>Promise<unknown>};
type Host={use:(name:string)=>Promise<Downloads|null>};
// Only these types can be saved from an embedded page; other text formats get a .txt suffix.
const ALLOWED=/\.(gif|png|jpe?g|webp|mp4|webm|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip)$/i;
const w=window as unknown as {claude?:Host;__BF_SAVE__?:(name:string,data:Blob)=>void};
if(w.claude){
  const downloads=w.claude.use('downloads');
  w.__BF_SAVE__=(name,data)=>{void downloads.then(d=>{if(!d)throw new Error('Saving files is not available here.');return d.save({filename:ALLOWED.test(name)?name:`${name}.txt`,data})}).catch(e=>console.warn('Save not completed:',e?.code??e))};
}
createRoot(document.getElementById('root')!).render(<Home/>);
