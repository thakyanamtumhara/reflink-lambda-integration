// AWS Lambda — payment-verification module called by /kal/.
// Lives in AWS Lambda; this copy in the repo is for review / diff only.
// Update AWS console after merging the second commit on this file.

const https = require("https");
const crypto = require("crypto");
const { vdn, mde, m } =  require("./hdfc.js")
const { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DeleteItemCommand,QueryCommand  } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");//marshall {k:{S:"mj"}}
const { SchedulerClient, CreateScheduleCommand, ListSchedulesCommand, DeleteScheduleCommand } = require("@aws-sdk/client-scheduler");

const client = new DynamoDBClient({ region:"ap-south-1" });

exports.vfypc=async(b)=>{
    try {
      let opt={method: 'GET',hostname: 'd2fzc2z1ecgedb.cloudfront.net',path:'/pc.js'}
      let out=await nfetch(opt);
      // console.log(out);
      let pc=JSON.parse(out.slice(8));
      // inttpc='32',od,tbl,txt='#16@Ztv4XtD1ZMZ8jac9CHRoZPcuZs==ZMBoCHJuZHB4Zn==',tchid='296.0z138' // let tch=b.tch.split('z');// 296.0z138
     console.log(b.ttpc,b.od,typeof pc,b.shp,b);
    //  pc[2]['Oversize 210gsm']=-50;
    let m=await decodod(b.ttpc,b.od,pc,b.shp,b);
      return m
    } catch (err) {console.log(err);return false}
  }

const nfetch=(e,n)=>{return new Promise((r,t)=>{let o=https.request(e,e=>{let n="";e.on("data",e=>{n+=e}),e.on("end",()=>{r(n)})});o.on("error",e=>{t(e)}),n&&o.write(n),o.end()})}
exports.nfetch=nfetch;
const tfetch=(e,t)=>new Promise((n,o)=>{let r=https.request(e,e=>{let t="";e.on("data",e=>{t+=e}),e.on("end",()=>{n(t)})});r.on("timeout",()=>{r.destroy(),n(1)}),r.on("error",e=>{o(e)}),t&&r.write(t),r.end()});
exports.tfetch=tfetch;

const modfetch = (url, method = "GET", body = null,h={}) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: method,
      headers: { "Content-Type": "application/json", ...h },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
};

exports.modfetch = modfetch;

// ─── HMAC token verifier for custom-courier rates (cstcr flow) ──────────────
// Mirrors getpc/cstcr_token.js. Token format:
//   <base64url(payload_json)>.<base64url(hmac_sha256)>
// payload = { pin, cn, wt, ch, exp }
// SECRET must be set as Lambda env var CSTCR_TOKEN_SECRET (same value as the
// getpc Railway service). Returns the parsed payload on success, or null on
// any failure (bad signature, expired, malformed, missing secret).
function _b64urlDecode(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Buffer.from(s, 'base64');
}
function verifyCstcrToken(token) {
    const SECRET = process.env.CSTCR_TOKEN_SECRET || '';
    if (!SECRET || !token || typeof token !== 'string') return null;
    const dot = token.indexOf('.');
    if (dot < 1) return null;
    const payloadB64 = token.slice(0, dot);
    const sigB64 = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', SECRET).update(payloadB64).digest();
    let provided;
    try { provided = _b64urlDecode(sigB64); } catch (e) { return null; }
    if (provided.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(provided, expected)) return null;
    let payload;
    try { payload = JSON.parse(_b64urlDecode(payloadB64).toString()); } catch (e) { return null; }
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
}
exports.verifyCstcrToken = verifyCstcrToken;

const orderx=(d = new Date(), m = 3)=>{
    const mth = d.getMonth(), y = d.getFullYear(), y1=(""+d.getFullYear()).slice(2);
    if (mth < m) {
      return ((y - 1) + "" + y1).slice(2);
    } else {
      return y1 + ("" + (y + 1)).slice(2);
    }
  }
  exports.orderx=orderx;

  exports.orderid = async () => {
    const params = {
       TableName: 'odid',Key: {"id":{"S":orderx()}},//marshall(vx),
       UpdateExpression: 'SET odid = odid + :incr',
       ExpressionAttributeValues: {
         ':incr': { N: '1' },
       },
       ReturnValues: 'ALL_NEW',
     };
       const data = await runfn(new UpdateItemCommand(params));
       // console.log(data)
       return orderx()+(new Date().getMonth()+1+'').padStart(2,0)+data.Attributes.odid.N.padStart(7, '0');
   }

   const runfn = async (params) => {
    try {
        const result = await client.send(params);
        // console.log('Item retrieved successfully:', result);
        return result;
    } catch (error) {
        console.error('Error retrieving item:', error);
        throw error;
    }
};

const decodod=async (inttpc,od,tbl,shp,e)=>{
  let odtot,odwt,odqt,odpc;
  odtot = {}, odwt = 0,odqt=0,odpc=0;// type:{pc:qty,pc:qty},type:type:{pc:qty,pc:qty} // type qty*pc+qty*pc=odpc
   try {// /:\s*(\d+)/g  Number(a) /\b\d+\b/g
  let sum = JSON.stringify(od).match(/:\s*(\d+)/g).reduce((p, a) => p + Number(a.slice(1)), 0);let odt=(sum > tbl[3].moq);
  Object.keys(od).forEach((t) => { //  type loop
    odtot[t] = {};
    Object.keys(od[t]).forEach((c) => {// color loop
      // console.log(t,c,od[t][c]); // Bio White {38: 7}
      Object.keys(od[t][c]).forEach((s) => { // size loop
        let v = od[t][c][s];
        // console.log(t, c, s, v); // Bio Black 40 8
        let pc = odt ? tbl[0][t][c][s] : tbl[2][t]; // sample/bulk
        (odtot[t][pc]) ? odtot[t][pc] += v : odtot[t][pc] = v;
        odwt += tbl[4][t] * v;
      });
    });
  });

    for (const t in odtot) {
    let cal = ''; let qtt = 0; let tpc = 0;
    for (const p in odtot[t]) {
      let qt = odtot[t][p];
      qtt += qt; tpc += qt*Number(p);
      // console.log(t, p, qt);
    }
    odqt+=qtt;odpc+=tpc;//console.log(odwt)
  }
    odwt=odwt.toFixed(2);

    // discount per piece
    let disc1=tbl[9][0][1]?tbl[9][0][1]*odqt:0;
    let disc2=tbl[9][1][1]?tbl[9][1][1]*odqt:0;
    odpc-=(disc1+disc2);

    console.log(e?.discMode,'sda',odpc,e);

    if (e?.hasOwnProperty('discMode') && !e?.discMode) {
      odpc += (disc1 + disc2); disc1 = 0; disc2 = 0;
      console.log('hi',odpc)
    } else if (e?.hasOwnProperty('discMode') && e?.discMode && tbl?.[11]) {
      let dv = true; Object.keys(od).forEach(t => { Object.keys(od[t]).forEach(c => { Object.keys(od[t][c]).forEach(s => { let v = od[t][c][s]; if (tbl[11][t] && (v <= 0 || v % tbl[11][t] !== 0)) dv = false; }); }); });
      if (!dv) { odpc += (disc1 + disc2); disc1 = 0; disc2 = 0;}
       console.log('dv ', dv, odpc)
    }else{
      console.log('hhhhi')
    }


    let shp1=shp.slice(-1);
    if(shp1==1||((shp1==4)&&e.b)){ // courier or Dropshipping B
    let txt=e.shpid,tchid=e.tchmth;
    // pch
    let pch = 0;
    if ((odqt > 10) && (odqt <= 20)) {
        pch = 100;
    } else {
        pch = ((odwt <= 2) ? 20 : 50 * Math.ceil(odwt / 25));
    }
    odpc+=pch;

    // tch
    let tch = 0;
    if (txt.includes('@')) {
        let t1 = txt.split('@');
        t1[1] = vdn(t1[1], m);
        let sp = -Number(t1[0].slice(1));
        t1 = [bstr(t1[1].slice(0, sp)), bstr(t1[1].slice(sp))];
        console.log('tchid match', t1[0], tchid);
        let tch1 = Number(tchid.split('z')[0]);
        if (t1[0].includes(tchid)) {
            tch = tch1;
        } else {return false}
    } else if (tchid.includes('zz')) {
        txt = vdn([...txt].reverse(), m);
        tch = Number(bstr(bstr(txt)));
    } else if (e?.cstcr) {
        // Custom-courier order from cc1's pincode→manual-courier flow.
        //
        // PRIMARY PATH: getpc's /code/custom-couriers response embeds an
        // HMAC-SHA256 token binding (pin, courier name, weight, charge, exp).
        // cc1 forwards it as e.cstcr_tok. We verify it offline using the
        // shared CSTCR_TOKEN_SECRET — no HTTP round-trip to Railway.
        //
        // Cross-field checks: payload.pin and payload.cn must match the
        // order's e.pin and e.cstcr, so a token issued for one (pin,courier)
        // pair can't be re-used on a different order. Token is read and
        // discarded — never stored on the order row.
        //
        // FALLBACK PATH: if no token (rollout in progress, or secret missing)
        // re-fetch from getpc and compare. Lets the system stay live during
        // deploy ordering. Once cc1 + getpc are both deployed with the
        // signed-token build, this fallback never fires for new orders.
        const claimed = Number(tchid.split('z')[0]);
        if (!Number.isFinite(claimed)) {
            console.log('[cstcr verify] claimed rate is not a number:', tchid);
            return false;
        }
        const billWt = odwt > 0 ? Math.ceil(odwt) : 0;
        let verified = null;

        if (e.cstcr_tok) {
            const payload = verifyCstcrToken(e.cstcr_tok);
            if (!payload) {
                console.log('[cstcr verify] token invalid/expired');
                return false;
            }
            // Cross-field bindings — token must match THIS order.
            if (Number(payload.pin) !== Number(e.pin)) {
                console.log('[cstcr verify] token pin mismatch', payload.pin, 'vs', e.pin);
                return false;
            }
            if (String(payload.cn) !== String(e.cstcr)) {
                console.log('[cstcr verify] token courier mismatch', payload.cn, 'vs', e.cstcr);
                return false;
            }
            if (Number(payload.wt) !== billWt) {
                console.log('[cstcr verify] token weight mismatch', payload.wt, 'vs', billWt);
                return false;
            }
            const expected = Number(payload.ch);
            if (!Number.isFinite(expected) || Math.abs(claimed - expected) > 0.01) {
                console.log('[cstcr verify] price mismatch — claimed', claimed, 'expected', expected);
                return false;
            }
            verified = expected;
            // SECURITY: discard the token after verification — it never
            // flows into the order record. Single-use semantics within its
            // 15-min window.
            try { delete e.cstcr_tok; } catch (ignore) {}
        } else {
            // Legacy / fallback re-fetch path (no signed token present).
            try {
                const lookup = await modfetch(
                    'https://getpc-production.up.railway.app/code/custom-couriers'
                    + '?pincode=' + encodeURIComponent(e.pin)
                    + '&weight='  + encodeURIComponent(odwt)
                );
                const data = JSON.parse(lookup);
                const match = data?.rows?.find(x => String(x.courier_name) === String(e.cstcr));
                if (!match) {
                    console.log('[cstcr verify fallback] courier not in DB for pin', e.pin, ':', e.cstcr);
                    return false;
                }
                const expected = Number(match.courier_charge);
                if (!Number.isFinite(expected) || Math.abs(claimed - expected) > 0.01) {
                    console.log('[cstcr verify fallback] price mismatch — claimed', claimed, 'expected', expected);
                    return false;
                }
                verified = expected;
            } catch (err) {
                console.log('[cstcr verify fallback] error', err);
                return false;
            }
        }
        tch = verified;   // server-trusted value flows into the existing odpc += tch line
    } else {return false}

    odpc+=tch;
    console.log('pch:',pch,' tch:',tch);
    }else if(shp1==2){ }// map Location
    else if((shp1==3)||(shp1==6)){ // transport bus
        let tpch; // =e.tpch;
    if(odwt<=20){
        tpch=350;
      }else if(odwt>20&&odwt<=40){
        tpch=450;
      }else if(odwt>40){
        tpch=500;
      }
      let p=0;
      if(shp1==6){
      p=900;if(odwt>30){p=30*Math.ceil(odwt)}
      }
        odpc+=(tpch+p);
    }else if(shp1==4){ // Dropshipping
       let pch=((odwt <= 2)?20:50 * Math.ceil(odwt / 25));
        odpc+=pch;
    }else if(shp1==5){
      //self
    }else{return false}

    let gst=Number((odpc*(tbl[6].gst/100)).toFixed(2)); // gst

    let calttpc=odpc+gst; // add all
    console.log(calttpc,odpc,gst,disc1,disc2);
    if ((parseInt(calttpc)==parseInt(inttpc))&&(sum==odqt)) {
      console.log(calttpc, inttpc,sum,odqt, 'caltotpc inttpc equal');
      return [calttpc,odpc,gst,disc1,disc2,odtot,odwt,odqt]
    } else {
      console.log(calttpc,inttpc,sum,odqt,'caltotpc inttpc not equal');
      return false
    }
   } catch (err) {
       console.log('error in decodod()',err);
       // return err
   }
}
exports.decodod=decodod;

const bstr=(v)=>Buffer.from(v, 'base64').toString();


let schedulerClient;
exports.xschedule = async (n,f,t,objstr) => {
  schedulerClient = schedulerClient||new SchedulerClient({});
  const scheduleName = n;
  const lambdaFunctionArn = f;
  const roleArn = "arn:aws:iam::053774856904:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_ca64586786";
  try {
      const date = new Date(t);
      const myt1 = date.toISOString().slice(0,-5);
      console.log("xschedule now:",date,myt1);
    const oneTimeExecution = `at(${myt1})`; // at(YYYY-MM-DDTHH:mm:ss) or at(YYYY-MM-DDTHH:mm)
    const scheduleParams = {
      Name: scheduleName,ScheduleExpression: oneTimeExecution,
      Target: {
        Arn: lambdaFunctionArn,RoleArn: roleArn,
        RetryPolicy: {MaximumRetryAttempts: 1,MaximumEventAgeInSeconds: 300},Input: objstr
      },
        ScheduleExpressionTimezone: "Asia/Calcutta",FlexibleTimeWindow: {Mode: "OFF"},State: "ENABLED"
    };

    const response = await schedulerClient.send(new CreateScheduleCommand(scheduleParams));
    console.log("Schedule created successfully with retry policy:", response);
  } catch (error) {
    console.error("Error creating schedule:", error);
  }
};
