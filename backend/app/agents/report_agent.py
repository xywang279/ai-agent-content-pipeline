from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from app.utils.llm_helper import get_llm
from app.utils.serpapi_helper import search_resource, get_links_doc
from app.utils.memory_manager import MemoryManager
from fpdf import FPDF
import os

def save_report_to_pdf(report_content: str, topic: str, output_dir: str = "reports") -> str:
    """
    将报告内容保存为 PDF 文件
    :param report_content: 报告正文（Markdown或纯文本）
    :param topic: 报告主题（用于文件名）
    :param output_dir: 保存目录
    :return: 文件路径
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    safe_title = "".join(c for c in topic if c.isalnum() or c in (' ', '_', '-')).rstrip()
    filename = f"{safe_title or 'report'}.pdf"
    filepath = os.path.join(output_dir, filename)

    pdf = FPDF()
    pdf.add_page()
    pdf.add_font('SimHei', '', 'SimHei.ttf', uni=True)  # 需要有 SimHei.ttf 中文字体文件
    pdf.set_font('SimHei', '', 14)
    for line in report_content.split('\n'):
        pdf.multi_cell(0, 10, line)
    pdf.output(filepath)
    return filepath

def generate_report(topic: str = "大模型") -> str:
    # 1. 新闻检索与网页加载
    search_results = search_resource(topic)
    docs = get_links_doc(search_results)
    if not docs:
        return "未能获取相关内容，无法生成报告。"

    # 2. 写入长期记忆（向量库）
    memory_manager = MemoryManager()
    vectorstore = memory_manager.create_or_load()
    memory_manager.add_texts([doc.page_content for doc in docs])

    # 3. 取出 vectorstore
    vectorstore = memory_manager.vectorstore
    if vectorstore is None:
        return "向量库初始化失败，无法生成报告。"

    # 4. 构建检索增强生成 Agent
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    prompt_template = """
你是一个专业的研究员，根据提供的资料，生成一份 Markdown 格式的结构化报告。
主题：{question}
要求：
1. 摘要最新关键信息
2. 列出 3~5 个重要趋势或要点
3. 用数据或实例支撑结论
4. 最后加上未来展望
资料：
{context}
"""
    prompt = PromptTemplate(template=prompt_template, input_variables=["question", "context"])
    llm = get_llm()

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=False  # 需要的话可设 True
    )

    # 5. 生成报告（注意传入 dict，key 为 "query"）
    result = qa_chain.invoke({"query": topic})

    # 6. 兼容不同 LangChain 版本的返回结构
    if isinstance(result, dict):
        report_content = result.get("result") or result.get("output_text") or ""
    else:
        report_content = str(result)

    # 7. 保存为 PDF
    pdf_path = save_report_to_pdf(report_content, topic)
    print(f"报告已保存为 PDF: {pdf_path}")
    return report_content

