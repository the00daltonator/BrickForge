import {serviceConfig,isOwner} from '@/lib/server/service';
export async function GET(r:Request){try{const c=await serviceConfig();return Response.json({aiEnabled:!!c.key,owner:isOwner(r),catalogEnabled:true},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({aiEnabled:false,owner:isOwner(r),catalogEnabled:true,storageUnavailable:true},{headers:{'Cache-Control':'no-store'}})}}
