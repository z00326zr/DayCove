export const nextSaveDelay=time=>10000-((time%10000+10000)%10000);

// Track edits separately from completed writes so a slow save cannot clear newer edits.
export class Autosave {
 constructor({snapshot,write,onState=()=>{},onError=()=>{},now=Date.now,setTimer=(fn,delay)=>setTimeout(fn,delay),clearTimer=id=>clearTimeout(id)}){
  Object.assign(this,{snapshot,write,onState,onError,now,setTimer,clearTimer});
  this.revision=0;this.savedRevision=0;this.queue=Promise.resolve();this.writing=false;this.error=null;this.timer=null;this.started=false;this.lastSaved=null;
 }
 get dirty(){return this.revision>this.savedRevision;}
 get hasUnsaved(){return this.dirty||this.writing;}
 emit(phase){this.onState({phase,time:this.lastSaved,error:this.error});}
 changed(){this.revision++;this.emit(this.writing?'saving':this.error?'error':'pending');}
 flush(){
  if(!this.dirty)return this.queue;
  const revision=this.revision;const snapshot=structuredClone(this.snapshot());
  const task=this.queue.catch(()=>{}).then(async()=>{
   if(revision<=this.savedRevision)return;
   this.writing=true;this.emit('saving');
   try{await this.write(snapshot);this.savedRevision=revision;this.error=null;this.lastSaved=this.now();this.writing=false;this.emit(this.dirty?'pending':'saved');}
   catch(error){this.writing=false;this.error=error;this.emit('error');this.onError(error);throw error;}
  });this.queue=task;return task;
 }
 start(){if(this.started)return;this.started=true;this.schedule();}
 schedule(){if(!this.started)return;this.timer=this.setTimer(()=>{this.timer=null;this.schedule();if(this.dirty)this.flush().catch(()=>{});},nextSaveDelay(this.now()));}
 stop(){this.started=false;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
}
