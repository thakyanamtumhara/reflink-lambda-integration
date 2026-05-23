import { initorderid, statusid, vdn, mde, m } from './hdfc.js'
import { orderid,vfypc,tfetch,modfetch,xschedule } from './mycode.js'
import {razorverify} from './rzr.js'
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand,QueryCommand  } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';//marshall {k:{S:"mj"}}
const client = new DynamoDBClient({ region:"ap-south-1" });
let meta={};
export const handler = async (e) => {
  console.log('done',meta);
  console.log(e);let p = e.path?e.path:e.rawPath;
  let bx=e.isBase64Encoded?qsa(bstr(e.body)):JSON.parse(e?.body||'{}');
  console.log('bx1',bx);

  if(bx?.zx){
    console.log('bx2');
  let vlx;
  switch (bx?.zx) {
    case 's1':
      console.log('rrrr1 initodid',bx);
      vlx=await initodid(bx);
      break;
    case 'rzrx': // rzr pay book form website and webhook
      console.log('rzrpay book',bx);
      // verify
      let m=razorverify(bx.res)
      if(m){
        vlx=await fcvc(bx);
      }
      break;
    case 'loged':
      console.log('rrrr2 charged',bx);// get temp order_id and get bill no.(final id) store in orders
     vlx=await charged(bx);
        break;
    case 'meta':
      console.log('rrrr3 booked', bx);
      //  vlx=bx;
      if(meta.hasOwnProperty(bx.teid)){
        return {statusCode: 200,headers:{"Content-Type":"application/json"},body: JSON.stringify({"odid":meta[bx.teid]})}
      }

      if(bx?.hdfcwebhook||bx?.b12||bx?.res){
          let b=await isbooked(bx.teid,'webhook111','webhook222');
          console.log('booked11111', b);
          if(b){// meta[bx.teid]='';
            return {statusCode: 200,headers:{"Content-Type":"application/json"},body: JSON.stringify({"message":"Already Booked"})}
          }
        }
      let vm;
      if(bx?.res&&bx?.teid){
        console.log('meta rzr', bx)
        delete bx.teid;bx.rzp=true;
        vm=razorverify(bx.res);
        if(!vm){
          return {statusCode: 200,headers:{"Content-Type":"application/json"},body: JSON.stringify({"odid":meta[bx.teid]})}
        }
      }
      vlx=await fcvc(bx);
        break;
    case 'test':
    // let v= await isbooked('A0517258vQfpDh8BKUYe','ff111','vcc222')  ;//vfypc(bx.p);
      console.log('v', process.env.xzrazor);
      return
     break;
    // case 's1': break;
    default:
      return {statusCode: 404,headers:{"Content-Type":"application/json"},body: '{"message":"Not Found"}'}
      break;
  }
  console.log('vvvvx', vlx)
  if(vlx.statusCode){return vlx}
  return {statusCode: 200,headers:{"Content-Type":"application/json"},body: JSON.stringify(vlx)}
}else if(bx?.event_name||bx?.event){
  let tid=bx?.content?.order?.order_id||bx?.payload?.payment?.entity?.id;
  if((bx?.event_name==='ORDER_SUCCEEDED')||(bx?.event==='payment.captured')&&!meta.hasOwnProperty(tid)){
    console.log('ORDER_SUCCEEDED',bx);
   let id=bx?.event?{"res":[tid]}:{};
    let bstr=JSON.stringify({"zx":"meta","teid":tid,...id,"hdfcwebhook":true});
    bstr=JSON.stringify({"body":bstr,"isBase64Encoded":false});
    // await payinsheet(e.body);
    // let out={"m":1234}
    let out=await schedule(tid,bstr);
    // let out=await Promise.allSettled([schedule(tid,bstr),payinsheet(e.body)]);
    return {statusCode: 200,headers:{"Content-Type":"application/json"},body: JSON.stringify(out)}
  }else{}
}else if(bx.sdk_status==='backpressed'){
  // return redirect html to home page / on cancel pay
  return {statusCode: 200,headers: {"Content-Type": "text/html"},body: '<html><body> <script>window.location.href="https://www.bulkplaintshirt.com"</script></body></html>'}
}

}

    // let pjson=JSON.parse(bstr1);// console.log('bstr1',pjson);
    // let bxx=e.isBase64Encoded?qsa(bstr(pjson.body)):JSON.parse(pjson?.body||'{}');
    // console.log('bxx', bxx);let out=bxx;

const schedule = async (n,objstr) => {
  console.log('rrrr1 schedule');const date = new Date();
  const utcMillis = date.getTime() + date.getTimezoneOffset() * 60000;
  const myt = new Date(utcMillis + 5.5 * 60 * 60 * 1000);myt.setMinutes(myt.getMinutes() + 1);
  console.log("schedule 2 minutes later:",date,myt);
  return await xschedule(n, "arn:aws:lambda:ap-south-1:053774856904:function:hdfcjuspay", myt.getTime(), objstr);
}

// const payinsheet=async(bx)=>{
// let b='/macros/s/AKfycbxbPYHDaR5WqEz3ZZRkfuZ8N0jwCh8ofDBLzBiatQmorLWaOIBg_QBh1nry0CSMc__Q/exec';
// let opt={method: 'POST',hostname: 'script.google.com',path:b,timeout: 2000}
// console.log('gdh1',bx);
// let cx=await tfetch(opt,bx);
// }

const payinsheet=async(bx)=>{
  let b='/macros/s/AKfycbxbPYHDaR5WqEz3ZZRkfuZ8N0jwCh8ofDBLzBiatQmorLWaOIBg_QBh1nry0CSMc__Q/exec';
  let opt={method: 'POST',hostname: 'script.google.com',path:b,timeout: 2000}
  console.log('gdh1',bx);
  let cx=await tfetch(opt,bx);
  }

const initodid=async(bx)=>{ //s1
  let m=await vfypc(bx.p);
  if(m){
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let mobile= 'A'+[...bx.p.mn1.slice(0,7)].reverse().join('');
    // let mobile = charset[new Date().getDate()]+Number(bx.p.mn1.slice(0,7)).toString(34).slice(2);
    let rantxt=Array.from({ length: 12 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
    const orderId =mobile+rantxt;let od=bx.p;
   let b=await initorderid(od.ttpc,od.mn1,od.id,od.nm+' '+od.shp,orderId,od.shp,bx?.r);// payment_links.web
   if(typeof b==='string'){b=JSON.parse(b)}
   if(bx?.r){
    mobile=b.id;rantxt=b.id
   }
   console.log({ "mobile": mobile, "orderid": rantxt,"order":'od' },b,b.id);
    await putfn1('ntemp',{ "mobile": mobile, "orderid": rantxt,"order":od });
    return b
  }
}

const isbooked=async(tid,ca,paid)=>{
  let booked=await getfnlatest('ntemp',tid,"booked");
  if (booked) {
    meta[tid]=booked.order[0]+booked.id;
    console.log('meta111', booked.order[0], booked.id);
  }
  console.log(' paid:'+paid,' done include:'+ca,' isbooked:'+(booked?'true '+tid:booked));
  return booked
}

  const charged=async(bx)=>{ //s2
  let scripts, paid=(bx.status=='CHARGED'), tid=bx.order_id;
  let ca=!meta.hasOwnProperty(tid);
  console.log("Done includes ",ca);
  if(paid&&ca&&!(await isbooked(tid,ca,paid))){ // done[done.length]=bx.order_id;
    scripts=`<script>let lk=window.location.href,tid="${tid}";
    console.log(${JSON.stringify(bx)},tid);
      if(!(localStorage?.getItem('cmp')==tid)){
    let dd=JSON.stringify({"teid":tid,"b12":"${bx.tr}","loaded111":document.cookie.includes(tid),"zx":"meta"})
        fetch(lk,{method:'POST',body:dd})
        .then(r=>r.json()).then(r=>{console.log(r);
        window.history.replaceState(null, document.title, '/?transation='+tid);
        document.cookie='load='+tid;localStorage.setItem('cmp', tid);
        let mk='<div class="fxc m12ud"><div class="w3-card-2" style="border-radius: 54px;padding: 34px;background: #04aa5066;"><svg xmlns="http://www.w3.org/2000/svg" style="display:grid;width: 40px;" viewBox="0 0 8 8" width="12"><path fill="#198754" d="M2.3 6.73.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z"></path></svg></div></div><style>.w3-card-2{box-shadow:0 2px 5px 0 rgba(0,0,0,0.16),0 2px 10px 0 rgba(0,0,0,0.12);}.m12ud{margin:12px 0!important;}.fxc{display:flex!important;}.fxc{justify-content:center;align-items:center;flex-direction: column;}</style>'
        document.querySelector('.w3-codespan').innerHTML=mk;
        window.location.replace("https://www.bulkplaintshirt.com/?paymentStatus=done&amt="+r.m+"&st="+r.dt);
      })
      }else{alert('Order Done Succesfully')}</script>`;

  }else{
    console.log(' BackpressPaid ');
    scripts=`<script>
    history.replaceState(null, '', '/');setTimeout(()=>{window.location.replace("https://www.bulkplaintshirt.com")},2000);
    </script>`
  }

const htmlContent = `<html><head><title>BulkPlainTshirt.com</title><meta name="viewport" content="width=device-width, minimum-scale=0.1"><style>.w3-codespan{font-family:Consolas,"courier new";font-size:18px;color:#7a8000;}
.fxc{display: grid;align-content:center;text-align: center;}.loading{width:100%;height:8px;background-color:aqua;position:relative;overflow:hidden;}
.loading::before{content:"";position:absolute;width:100%;height:100%;background-color:lawngreen;animation:slide 1s linear infinite;}
@keyframes slide{0%{left:-100%;}100%{left:100%;}}</style></head><body class="fxc" style="height: 100vh;background-color: #f1f1f1;">
<div class="w3-codespan">Please Wait...<div class="loading" style="width: 95%;"></div></div>
</body>`+scripts+`</html>`;//<p>${bx1}</p>
return {statusCode: 200,headers: {"Content-Type": "text/html"},body: htmlContent};
}

const fcvc=async(bx)=>{ //s3
  let mod;
  if(bx?.teid){
    mod=await getfnlatest('ntemp',bx.teid.slice(0,8),bx.teid.slice(8));console.log('temporder',mod);
  }else if(bx?.res){
    mod=await getfnlatest('ntemp', bx.res[0], bx.res[0]);console.log('temporder rzp', mod);
  }
   if(bx?.res1){
    mod=await getfnlatest('ntemp', bx.teid.slice(0,3),bx.teid.slice(-12));console.log('temporderfdf', mod);
  }

  if (mod) {
  let od=mod.order;
  let pass=false;
  if(bx?.b12){
    let enb64=atob(vdn(bx.b12,mde));let b64=od.ttpc+""+od.shp;
    console.log('enb64:', enb64, ' b64:', b64);
    pass=(enb64===b64);
  }else if(bx.hdfcwebhook){
    pass=true;
  }else if(bx.rzp){
    pass=true;bx.teid=bx.orderid;
  }

  if(pass){//
    // let m=bx.teid.slice(0,8)+new Date(od.dt).getDay().toString().padStart(2,'0');
    let idx=await orderid();console.log('idx',idx);
    od.stsx=idx.slice(0,6);od.odid=od.id+idx;meta[bx.teid]=od.odid;//delete od.id;
    mod.hj1=await putfn1('ntemp',{ "mobile": bx.teid, "orderid": "booked", "id":idx, "order":[od.id]});
    od.hj2=await putfn1('orders',od);await putfn1('bookedOrder',{"bookStatus":"booked","OrderID":od.id,"odid":od.odid})
    let bn="odid="+od.odid+"&todid="+od.dt;console.log('save in orders, ntemp, bookedOrder db:',mod.hj1,od.hj2,' sheet bn:'+bn)
    // bn='/?w=https://script.google.com/macros/s/AKfycbxXWJGTlbU8oiXqBJ7a678POQhCC7sdcqlotW4mXKmiQiOBsjMCpOtywWjINo28GGLtDg/exec?'+bn;
    // bn={hostname: 'sheetproxy.pages.dev',path: bn,method: 'GET',timeout: 2000}
    bn={hostname: 'getpc-production.up.railway.app',path: '/code?'+bn,method: 'GET',timeout: 20000}
    let urlfb=`https://website-order-data-from-aws-default-rtdb.asia-southeast1.firebasedatabase.app/orders/${idx}.json`;

    try {
      od?.hj2 && (delete od?.hj2)
      bn=await Promise.allSettled([tfetch(bn),modfetch(urlfb, "PUT", od)]);
    } catch (e) {
      console.log('Error in fetch:', e?.message,e?.stack,e, od);
    }
    console.log('bnfetch:', bn,od);

    return {"m":od.odid,"dt":od.dt}
  }
  }
  return {"m":false}
}

const bstr=(v)=>Buffer.from(v, 'base64').toString();
const qsa=(q)=>q.split('&').reduce((a, v) => {v=v.split('=');return (a[v[0]] = (v[1]), a);}, {});

const putfn1 = async (tbl,vx,c) => {
  vx=c?vx:marshall(vx);// if(c){vx=vx;}else{vx=marshall(vx);}
  const px = {TableName: tbl,Item: vx};
  const result = await runfn(new PutItemCommand(px));
    console.log('Item put successfully in DB:', tbl, result);
    return result;
};

const getfn1 = async (tbl,p1,p2) => {
    const px = {TableName: tbl,Key: {mobile:{S:p1},orderid:{S:p2}} };
    //JSON.parse(`{${pk}:{S:${pkv}},${sk}:{S:${skv}}`),// Key: {mail:{S:"onk2@GMAI.COM"},typx:{S:"meta"}}
  const result = await runfn(new GetItemCommand(px));
    if(result.Item){return unmarshall(result.Item);}else{
      return false
    }
};

const getfnlatest = async (tbl,p1,p2) => {
  const px = {TableName: tbl,Key: {mobile:{S:p1},orderid:{S:p2}},ConsistentRead: true };
const result = await runfn(new GetItemCommand(px));
  if(result.Item){return unmarshall(result.Item);}else{
    return false
  }
};

const runfn = async (params) => {
    try {
        const result = await client.send(params);
        return result;
    } catch (error) {
        console.error('Error in runfn:', error);
        throw error;
    }
};
