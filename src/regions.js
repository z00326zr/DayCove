import regions from './data/regions.json' with {type:'json'};
export {regions};
export function cityName(province,city){return ['市辖区','县','省直辖县级行政区划','自治区直辖县级行政区划'].includes(city.name)&&['11','12','31','50'].includes(province.code)?province.name:city.name;}
export function catalogPlace(provinceCode,cityCode=null,countyCode=null){
 const province=regions.find(p=>p.code===provinceCode),city=province?.children.find(c=>c.code===cityCode),county=countyCode?city?.children.find(c=>c.code===countyCode):null;
 if(!province||(cityCode&&!city)||(countyCode&&!county))throw Error('请选择有效的省、市及区县');
 return {province:{code:province.code,name:province.name},city:city?{code:city.code,name:cityName(province,city)}:null,county:county?{code:county.code,name:county.name}:null};
}
