export function isNonLearningChat(query: string) {
  const normalized = query.trim().toLowerCase().replace(/[\s？?！!。.，,]/g, "");
  if (!normalized) return true;
  const exactIntents = ["你是谁", "你是什么", "你叫什么", "介绍一下你", "你好", "hi", "hello", "在吗", "谢谢", "谢谢你"];
  if (exactIntents.includes(normalized)) return true;
  return /^(你是谁|你是什么|你叫什么|你能做什么|介绍一下你)/.test(normalized);
}

export function shouldSearchKnowledgeBase(query: string) {
  if (isNonLearningChat(query)) return false;
  return true;
}
