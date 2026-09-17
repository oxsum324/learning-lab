export const SEED_DAY_MAP={
 'structural-analysis':{
  1:{questions:['a'],fields:['st_core_01']},2:{questions:['b'],fields:['st_core_02']},3:{questions:['s'],fields:[]},4:{questions:['a'],fields:['st_core_04']},5:{questions:['t'],fields:['st_core_05']},6:{questions:['f'],fields:['st_core_06']},7:{questions:['w1','s'],fields:['st_week_07a']},14:{questions:['w2','w2b'],fields:['st_week_14a','st_week_14b']},23:{questions:['j','w3'],fields:['st_week_23a','st_week_23b']}
 },
 'reinforced-concrete':{
  1:{questions:[],fields:[]},2:{questions:['rc_core_01'],fields:['rc_core_01']},3:{questions:['rc_core_02'],fields:['rc_core_02']},4:{questions:['rc_core_04'],fields:['rc_core_04']},5:{questions:['rc_core_05'],fields:['rc_core_05']},6:{questions:['rc_core_03'],fields:['rc_core_03']},7:{questions:['rc_week_07a','rc_week_07b'],fields:['rc_week_07a','rc_week_07b']},14:{questions:['rc_week_14a','rc_week_14b'],fields:['rc_week_14a','rc_week_14b']},23:{questions:['rc_week_23a','rc_week_23b'],fields:['rc_week_23a','rc_week_23b']}
 },
 'steel-structures':{
  1:{questions:[],fields:[]},2:{questions:['st_c02'],fields:['st_c02']},3:{questions:['st_c03'],fields:['st_c03']},4:{questions:['st_c04'],fields:['st_c04']},5:{questions:['st_c05'],fields:['st_c05']},6:{questions:['st_c06'],fields:['st_c06']},7:{questions:['st_c07','st_w07a','st_w07b'],fields:['st_c07','st_w07a','st_w07b']},14:{questions:['st_w14a','st_w14b'],fields:['st_w14a','st_w14b']},23:{questions:['st_w23a','st_w23b'],fields:['st_w23a','st_w23b']}
 },
 'structural-dynamics':{
  1:{questions:[],fields:[]},2:{questions:['dy_c02'],fields:['dy_c02']},3:{questions:['dy_c03'],fields:['dy_c03']},4:{questions:['dy_c04'],fields:['dy_c04']},5:{questions:['dy_c05'],fields:['dy_c05']},6:{questions:['dy_c06'],fields:['dy_c06']},7:{questions:['dy_c07','dy_w07a','dy_w07b'],fields:['dy_c07','dy_w07a','dy_w07b']},14:{questions:['dy_w14a','dy_w14b'],fields:['dy_w14a','dy_w14b']},23:{questions:['dy_w23a','dy_w23b'],fields:['dy_w23a','dy_w23b']}
 },
 'soil-foundations':{
  1:{questions:[],fields:[]},2:{questions:['so_c02'],fields:['so_c02']},3:{questions:['so_c03'],fields:['so_c03']},4:{questions:['so_c04'],fields:['so_c04']},5:{questions:['so_c05'],fields:['so_c05']},6:{questions:['so_c06'],fields:['so_c06']},7:{questions:['so_c07','so_w07a','so_w07b'],fields:['so_c07','so_w07a','so_w07b']},14:{questions:['so_w14a','so_w14b'],fields:['so_w14a','so_w14b']},23:{questions:['so_w23a','so_w23b'],fields:['so_w23a','so_w23b']}
 }
};
export function seedDay(topicId,day){return SEED_DAY_MAP[topicId]?.[day]??{questions:[],fields:[]};}
