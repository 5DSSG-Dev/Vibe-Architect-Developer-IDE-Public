import { normalizeDocument } from './model.js';
const articles=[...document.querySelectorAll('[data-document-id]')];
const retry=document.querySelector('#retry');
const loadStatus=document.querySelector('#load-status');
function element(tag,text,className) {
  const node=document.createElement(tag); if(text!==undefined) node.textContent=text;
  if(className) node.className=className;
  return node;
}
export function renderDocument(article, record) {
  const body=article.querySelector('.document-body');body.replaceChildren();
  article.querySelector('.document-status').textContent=record.status==='approved'?'Introduction':record.status==='reviewed'?'Reviewed draft · awaiting publication review':'Draft introduction · awaiting review';
  if(record.intro) body.append(element('p',record.intro,'intro'));
  for(const section of record.sections) {
    const wrapper=element('section');
    if(section.heading) wrapper.append(element('h3',section.heading));
    for(const paragraph of section.paragraphs) wrapper.append(element('p',paragraph));
    body.append(wrapper);
  }
  if(record.sources.length) {
    const section=element('section');section.append(element('h3','Explore further'));
    const list=element('ul');
    for(const source of record.sources) {
      const item=element('li'), link=element('a',source.label);link.href=source.url;
      item.append(link);list.append(item);
    }
    section.append(list);body.append(section);
  }
}
export async function loadDocuments() {
  const response=await fetch('content/documents.json',{cache:'no-cache'});
  if(!response.ok) throw Error('Content could not be loaded');
  const data=await response.json();
  if(!data || typeof data.documents!=='object' || data.documents===null || Array.isArray(data.documents)) throw Error('Invalid content file');
  return data.documents;
}
function focusSection() {
  if(!location.hash || location.hash.startsWith('#target-')) return;
  const section=document.getElementById(location.hash.slice(1));
  if(!section) {
    loadStatus.textContent='Section not found. Choose an introduction from the contents below.';
    return;
  }
  section.focus({preventScroll:true});section.scrollIntoView({block:'start'});
}
async function initialize() {
  retry.hidden=true;loadStatus.textContent='Opening the introductions…';
  for(const article of articles) article.setAttribute('aria-busy','true');
  let invalid=0;
  try {
    const documents=await loadDocuments();
    for(const article of articles) {
      const id=article.dataset.documentId;
      const result=normalizeDocument(id,Object.hasOwn(documents,id)?documents[id]:null);
      if(result.kind==='document') renderDocument(article,result.record);
      else if(result.kind==='invalid') {
        invalid++;
        article.querySelector('.document-status').textContent='This introduction could not open';
        article.querySelector('.document-body').replaceChildren(element('p','The content format needs attention. You can retry or choose another section.'));
      } else {
        article.querySelector('.document-status').textContent='This introduction is being prepared';
        const body=article.querySelector('.document-body');
        body.replaceChildren(element('p','The book has its place in the Atlas. Its introduction will appear here when the content is ready.','intro'));
        if(id==='aegis-codex') body.append(element('p','Codex link coming soon.'));
      }
    }
    loadStatus.textContent=invalid?'Some introductions could not open. You can retry.':'';
    retry.hidden=!invalid;
  } catch {
    loadStatus.textContent='The introductions could not load. You can retry, browse the contents, or return to the Atlas.';
    retry.hidden=false;
    for(const article of articles) article.querySelector('.document-status').textContent='Content temporarily unavailable';
  } finally {
    for(const article of articles) article.removeAttribute('aria-busy');
    focusSection();
  }
}
retry.addEventListener('click',initialize);
window.addEventListener('hashchange',focusSection);
initialize();
