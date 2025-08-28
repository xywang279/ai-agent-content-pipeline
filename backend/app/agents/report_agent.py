from typing import Dict, List
import asyncio
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from app.utils.llm_helper import llm_helper
from app.utils.serpapi_helper import search_resource, get_links_doc
from app.utils.memory_manager import MemoryManager
from fpdf import FPDF
import os
class ReportAgent:
    def __init__(self):
        self.report_templates = {
            "standard": {
                "title": "标准报告模板",
                "structure": ["标题", "摘要", "背景", "分析", "结论", "建议"]
            },
            "analysis": {
                "title": "分析报告模板",
                "structure": ["标题", "执行摘要", "问题陈述", "数据分析", "发现", "结论", "建议"]
            },
            "research": {
                "title": "研究报告模板",
                "structure": ["标题", "摘要", "引言", "方法", "结果", "讨论", "结论", "参考文献"]
            }
        }
    
    async def generate_report(self, report_info: Dict, template_type: str = "standard") -> str:
        """生成报告"""
        try:
            # 构造报告生成提示
            prompt = self._build_report_prompt(report_info, template_type)
            
            messages = [
                {"role": "system", "content": "你是一个专业的报告撰写助手，请根据用户提供的信息生成结构化的报告。"},
                {"role": "user", "content": prompt}
            ]
            
            # 调用 LLM 生成报告
            response = await llm_helper.chat_completion(
                messages=messages,
                temperature=0.7
                
            )
            
            return response["choices"][0]["message"]["content"]
        except Exception as e:
            raise Exception(f"报告生成失败: {str(e)}")
    
    async def optimize_report(self, current_report: str, optimization_request: str) -> str:
        """优化现有报告"""
        try:
            prompt = f"""请根据以下优化请求修改报告：

当前报告：
{current_report}

优化请求：
{optimization_request}

请提供修改后的完整报告。"""
            
            messages = [
                {"role": "system", "content": "你是一个专业的报告优化助手，请根据用户的要求优化报告内容。"},
                {"role": "user", "content": prompt}
            ]
            
            response = await llm_helper.chat_completion(
                messages=messages,
                temperature=0.7
            )
            
            return response["choices"][0]["message"]["content"]
        except Exception as e:
            raise Exception(f"报告优化失败: {str(e)}")
    def _build_report_prompt(self, report_info: Dict, template_type: str) -> str:
            """构建报告生成提示"""
            template = self.report_templates.get(template_type, self.report_templates["standard"])
            
            prompt = f"""请根据以下信息生成一份{template['title']}：

    报告主题：{report_info.get('topic', '未指定主题')}

    收集到的信息：
    {report_info.get('raw_content', '无具体内容')}

    报告结构要求：
    """ + "\n".join([f"{i+1}. {section}" for i, section in enumerate(template['structure'])])

            if report_info.get('requirements'):
                prompt += f"\n\n特殊要求：\n" + "\n".join([f"- {req}" for req in report_info['requirements']])

            if report_info.get('data_points'):
                prompt += f"\n\n数据点：\n" + "\n".join([f"- {data}" for data in report_info['data_points']])

            if report_info.get('conclusions'):
                prompt += f"\n\n初步结论：\n" + "\n".join([f"- {con}" for con in report_info['conclusions']])

            prompt += f"""

    请生成一份完整、结构清晰、内容详实的报告。要求：
    1. 严格按照指定结构组织内容
    2. 语言专业、准确
    3. 内容充实，逻辑清晰
    4. 如有数据，请合理推测和补充
    5. 结论部分要有深度和见解"""

            return prompt


       
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

    async def generate_report_old(topic: str = "大模型") -> str:
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
         # 用 llm_helper 生成内容
        context = "\n".join([doc.page_content for doc in docs])
        messages = [
            {"role": "system", "content": "你是一个专业的报告撰写助手。"},
            {"role": "user", "content": prompt.format(question=topic, context=context)}
        ]
        response = await llm_helper.chat_completion(
            messages=messages,
            temperature=0.7
        )
        report_content = response["choices"][0]["message"]["content"]


        # 7. 保存为 PDF
        pdf_path = self.save_report_to_pdf(report_content, topic)
        print(f"报告已保存为 PDF: {pdf_path}")
        return report_content

# 全局报告生成器实例
report_agent = ReportAgent()