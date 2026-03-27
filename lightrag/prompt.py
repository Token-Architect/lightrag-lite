from __future__ import annotations
from typing import Any


PROMPTS: dict[str, Any] = {}

# All delimiters must be formatted as "<|UPPER_CASE_STRING|>"
PROMPTS["DEFAULT_TUPLE_DELIMITER"] = "<|#|>"
PROMPTS["DEFAULT_COMPLETION_DELIMITER"] = "<|COMPLETE|>"

PROMPTS["entity_extraction_system_prompt"] = """---角色---
你是一名知识图谱专家，负责从输入文本中提取实体和关系。

---指令---
1.  **实体提取与输出：**
    *   **识别：** 识别输入文本中定义清晰且有意义的实体。
    *   **实体详情：** 对于每个识别出的实体，提取以下信息：
        *   `entity_name`：实体的名称。如果实体名称不区分大小写，请将每个重要单词的首字母大写（标题大小写）。确保在整个提取过程中**命名一致**。
        *   `entity_type`：使用以下类型之一对实体进行分类：`{entity_types}`。如果提供的实体类型都不适用，请不要添加新的实体类型，将其归类为 `Other`。
        *   `entity_description`：仅基于输入文本中的信息，提供关于实体属性和活动的简明扼要但全面的描述。
    *   **输出格式 - 实体：** 每个实体输出一行，包含 4 个字段，由 `{tuple_delimiter}` 分隔。第一个字段*必须*是字面字符串 `entity`。
        *   格式：`entity{tuple_delimiter}entity_name{tuple_delimiter}entity_type{tuple_delimiter}entity_description`

2.  **关系提取与输出：**
    *   **识别：** 识别先前提取的实体之间直接、表述清晰且有意义的关系。
    *   **N 元关系分解：** 如果单个陈述描述了涉及两个以上实体的关系（N 元关系），请将其分解为多个二元（双实体）关系对分别进行描述。
        *   **示例：** 对于“Alice、Bob 和 Carol 在项目 X 上进行了合作”，根据最合理的二元解释，提取二元关系，如“Alice 与项目 X 合作”、“Bob 与项目 X 合作”和“Carol 与项目 X 合作”，或“Alice 与 Bob 合作”。
    *   **关系详情：** 对于每个二元关系，提取以下字段：
        *   `source_entity`：源实体的名称。确保与实体提取时的**命名一致**。如果名称不区分大小写，请将每个重要单词的首字母大写（标题大小写）。
        *   `target_entity`：目标实体的名称。确保与实体提取时的**命名一致**。如果名称不区分大小写，请将每个重要单词的首字母大写（标题大小写）。
        *   `relationship_keywords`：一个或多个高级关键词，总结关系的总体性质、概念或主题。该字段内的多个关键词必须用逗号 `,` 分隔。**切勿在此字段内使用 `{tuple_delimiter}` 分隔多个关键词。**
        *   `relationship_description`：对源实体和目标实体之间关系性质的简明解释，为其连接提供清晰的理由。
    *   **输出格式 - 关系：** 每个关系输出一行，包含 5 个字段，由 `{tuple_delimiter}` 分隔。第一个字段*必须*是字面字符串 `relation`。
        *   格式：`relation{tuple_delimiter}source_entity{tuple_delimiter}target_entity{tuple_delimiter}relationship_keywords{tuple_delimiter}relationship_description`

3.  **分隔符使用协议：**
    *   `{tuple_delimiter}` 是一个完整的原子标记，**不得填充内容**。它严格作为字段分隔符。
    *   **错误示例：** `entity{tuple_delimiter}Tokyo<|location|>Tokyo is the capital of Japan.`
    *   **正确示例：** `entity{tuple_delimiter}Tokyo{tuple_delimiter}location{tuple_delimiter}Tokyo is the capital of Japan.`

4.  **关系方向与重复：**
    *   除非明确说明，否则将所有关系视为**无向**。交换无向关系的源实体和目标实体不构成新关系。
    *   避免输出重复的关系。

5.  **输出顺序与优先级：**
    *   首先输出所有提取的实体，然后是所有提取的关系。
    *   在关系列表中，优先输出对输入文本核心含义**最重要**的关系。

6.  **上下文与客观性：**
    *   确保所有实体名称和描述都以**第三人称**书写。
    *   明确指出主体或客体；**避免使用代词**，如 `this article`、`this paper`、`our company`、`I`、`you` 和 `he/she`。

7.  **语言与专有名词：**
    *   整个输出（实体名称、关键词和描述）必须使用中文书写。
    *   实体命名遵循“**中文优先、标准统一**”原则：若存在通行的中文标准名称，必须使用中文标准名称（例如组织、地名、产品、术语）。
    *   仅在以下情况允许保留英文或混合形式：代码标识符、协议/型号/版本号、文件名/路径、URL、邮箱、哈希值、标准缩写（如 API、GPU、HTTP）以及无法准确翻译的专名。
    *   除上述例外外，禁止仅因原文是英文就保留英文实体名。

8.  **完成信号：** 只有在完全提取并输出所有符合标准的实体和关系后，才输出字面字符串 `{completion_delimiter}`。

---示例---
{examples}
"""

PROMPTS["entity_extraction_user_prompt"] = """---任务---
从下面的“待处理数据”中的输入文本中提取实体和关系。

---指令---
1.  **严格遵守格式：** 严格遵守系统提示中指定的所有实体和关系列表的格式要求，包括输出顺序、字段分隔符和专有名词处理。
2.  **仅输出内容：** *仅*输出提取的实体和关系列表。不要在列表之前或之后包含任何介绍性或总结性的评论、解释或其他文本。
3.  **完成信号：** 在提取并呈现所有相关实体和关系后，输出 `{completion_delimiter}` 作为最后一行。
4.  **输出语言：** 确保输出语言为 {language}，并对实体名称执行“中文优先、标准统一”。仅对代码/符号/编码/标准缩写等不可翻译或不宜翻译内容保留英文。

---待处理数据---
<Entity_types>
[{entity_types}]

<Input Text>
```
{input_text}
```

<Output>
"""

PROMPTS["entity_continue_extraction_user_prompt"] = """---任务---
基于上一次提取任务，从输入文本中识别并提取任何**遗漏或格式错误**的实体和关系。

---指令---
1.  **严格遵守系统格式：** 严格遵守系统指令中指定的所有实体和关系列表的格式要求，包括输出顺序、字段分隔符和专有名词处理。
2.  **关注更正/补充：**
    *   **不要**重新输出上一次任务中**正确且完整**提取的实体和关系。
    *   如果上一次任务中**遗漏**了某个实体或关系，请现在根据系统格式进行提取并输出。
    *   如果上一次任务中某个实体或关系**被截断、字段缺失或格式错误**，请按照指定格式重新输出*更正后的完整*版本。
3.  **输出格式 - 实体：** 每个实体输出一行，包含 4 个字段，由 `{tuple_delimiter}` 分隔。第一个字段*必须*是字面字符串 `entity`。
4.  **输出格式 - 关系：** 每个关系输出一行，包含 5 个字段，由 `{tuple_delimiter}` 分隔。第一个字段*必须*是字面字符串 `relation`。
5.  **仅输出内容：** *仅*输出提取的实体和关系列表。不要在列表之前或之后包含任何介绍性或总结性的评论、解释或其他文本。
6.  **完成信号：** 在提取并呈现所有相关的遗漏或更正的实体和关系后，输出 `{completion_delimiter}` 作为最后一行。
7.  **输出语言：** 确保输出语言为 {language}，并对实体名称执行“中文优先、标准统一”。仅对代码/符号/编码/标准缩写等不可翻译或不宜翻译内容保留英文。

<Output>
"""

PROMPTS["entity_extraction_examples"] = [
    """<Entity_types>
["Person","Organization","Location","Event","Time"]

<Input Text>
```
李白是唐朝著名的诗人，他出生于碎叶城，后来游历了中国的许多名山大川。他在长安遇到了杜甫，两人结下了深厚的友谊。
```

<Output>
entity{tuple_delimiter}李白{tuple_delimiter}Person{tuple_delimiter}李白是唐朝的一位著名诗人，以其浪漫主义诗歌而闻名。
entity{tuple_delimiter}唐朝{tuple_delimiter}Time{tuple_delimiter}唐朝是中国历史上的一个繁荣时期。
entity{tuple_delimiter}碎叶城{tuple_delimiter}Location{tuple_delimiter}碎叶城是李白的出生地。
entity{tuple_delimiter}中国{tuple_delimiter}Location{tuple_delimiter}中国是一个拥有许多名山大川的国家。
entity{tuple_delimiter}长安{tuple_delimiter}Location{tuple_delimiter}长安是唐朝的首都，李白在那里遇到了杜甫。
entity{tuple_delimiter}杜甫{tuple_delimiter}Person{tuple_delimiter}杜甫是唐朝另一位著名的诗人，与李白有深厚的友谊。
relation{tuple_delimiter}李白{tuple_delimiter}碎叶城{tuple_delimiter}出生地{tuple_delimiter}李白出生于碎叶城。
relation{tuple_delimiter}李白{tuple_delimiter}杜甫{tuple_delimiter}友谊{tuple_delimiter}李白在长安遇到了杜甫，两人建立了深厚的友谊。
{completion_delimiter}

""",
    """<Entity_types>
["Person","Creature","Organization","Location","Event","Concept","Method","Content","Data","Artifact","NaturalObject"]

<Input Text>
```
At the World Athletics Championship in Tokyo, Noah Carter broke the 100m sprint record using cutting-edge carbon-fiber spikes.
```

<Output>
entity{tuple_delimiter}World Athletics Championship{tuple_delimiter}event{tuple_delimiter}The World Athletics Championship is a global sports competition featuring top athletes in track and field.
entity{tuple_delimiter}Tokyo{tuple_delimiter}location{tuple_delimiter}Tokyo is the host city of the World Athletics Championship.
entity{tuple_delimiter}Noah Carter{tuple_delimiter}person{tuple_delimiter}Noah Carter is a sprinter who set a new record in the 100m sprint at the World Athletics Championship.
entity{tuple_delimiter}100m Sprint Record{tuple_delimiter}category{tuple_delimiter}The 100m sprint record is a benchmark in athletics, recently broken by Noah Carter.
entity{tuple_delimiter}Carbon-Fiber Spikes{tuple_delimiter}equipment{tuple_delimiter}Carbon-fiber spikes are advanced sprinting shoes that provide enhanced speed and traction.
entity{tuple_delimiter}World Athletics Federation{tuple_delimiter}organization{tuple_delimiter}The World Athletics Federation is the governing body overseeing the World Athletics Championship and record validations.
relation{tuple_delimiter}World Athletics Championship{tuple_delimiter}Tokyo{tuple_delimiter}event location, international competition{tuple_delimiter}The World Athletics Championship is being hosted in Tokyo.
relation{tuple_delimiter}Noah Carter{tuple_delimiter}100m Sprint Record{tuple_delimiter}athlete achievement, record-breaking{tuple_delimiter}Noah Carter set a new 100m sprint record at the championship.
relation{tuple_delimiter}Noah Carter{tuple_delimiter}Carbon-Fiber Spikes{tuple_delimiter}athletic equipment, performance boost{tuple_delimiter}Noah Carter used carbon-fiber spikes to enhance performance during the race.
relation{tuple_delimiter}Noah Carter{tuple_delimiter}World Athletics Championship{tuple_delimiter}athlete participation, competition{tuple_delimiter}Noah Carter is competing at the World Athletics Championship.
{completion_delimiter}

"""
]

PROMPTS["summarize_entity_descriptions"] = """---角色---
你是一名知识图谱专家，擅长数据整理和综合。

---任务---
你的任务是将给定实体或关系的描述列表综合成一个单一、全面且连贯的摘要。

---指令---
1. 输入格式：描述列表以 JSON 格式提供。每个 JSON 对象（代表单个描述）在 `Description List` 部分中占一行。
2. 输出格式：合并后的描述将以纯文本形式返回，分多段呈现，摘要前后不包含任何额外的格式或无关的评论。
3. 全面性：摘要必须整合*每个*提供的描述中的所有关键信息。不要遗漏任何重要的事实或细节。
4. 上下文：确保摘要是以客观的第三人称视角撰写的；为了清晰和上下文完整，请明确提及实体或关系的名称。
5. 上下文与客观性：
  - 以客观的第三人称视角撰写摘要。
  - 在摘要的开头明确提及实体或关系的全名，以确保立即清晰并提供上下文。
6. 冲突处理：
  - 如果出现相互冲突或不一致的描述，首先确定这些冲突是否源于共享相同名称的多个不同实体或关系。
  - 如果识别出不同的实体/关系，请在整体输出中*分别*总结每一个。
  - 如果单个实体/关系内部存在冲突（例如历史差异），请尝试调和它们或在注明不确定性的情况下同时呈现两种观点。
7. 长度限制：摘要的总长度不得超过 {summary_length} 个 token，同时保持深度和完整性。
8. 语言：整个输出必须使用 {language} 书写。如果没有适当的翻译，专有名词（例如人名、地名、组织名）可以使用其原始语言。
  - 整个输出必须使用 {language} 书写。
  - 专有名词（例如人名、地名、组织名）如果没有适当的、广泛接受的翻译或翻译会引起歧义，应保留其原始语言。
  - **重要：如果输入的描述是中文的，或者要求的语言是中文，你必须直接用中文进行总结，不要翻译成英文。**

---Input---
{description_type} Name: {description_name}

Description List:

```
{description_list}
```

---Output---
"""

PROMPTS["fail_response"] = (
    "抱歉，我无法回答该问题。[no-context]"
)

PROMPTS["rag_response"] = """---角色---

你是一位专业的 AI 助手，擅长从提供的知识库中综合信息。你的主要职能是*仅*使用提供的**上下文**中的信息准确回答用户查询。

---目标---

生成一个全面、结构良好的用户查询答案。
答案必须整合在**上下文**中发现的知识图谱和文档块中的相关事实。
如果提供了对话历史，请考虑它以保持对话流畅并避免重复信息。

---指令---

1. 分步说明：
  - 在对话历史的背景下仔细确定用户的查询意图，以充分理解用户的信息需求。
  - 仔细审查**上下文**中的`知识图谱数据`和`文档块`。识别并提取所有与回答用户查询直接相关的信息片段。
  - 将提取的事实编织成一个连贯且合乎逻辑的回答。你自己的知识*仅*用于构建流畅的句子和连接想法，*不得*引入任何外部信息。
  - 跟踪直接支持回答中陈述的事实的文档块的 reference_id。将 reference_id 与 `参考文档列表` 中的条目相关联，以生成适当的引用。
  - 在回答末尾生成参考文献部分。每个参考文档必须直接支持回答中陈述的事实。
  - 不要在参考文献部分之后生成任何内容。

2. 内容与依据：
  - 严格遵守**上下文**中提供的内容；**不得**编造、假设或推断任何未明确陈述的信息。
  - 如果在**上下文**中找不到答案，请说明你没有足够的信息来回答。不要试图猜测。

3. 格式与语言：
  - 回答必须使用与用户查询相同的语言。
  - 回答必须使用 Markdown 格式以增强清晰度和结构（例如，标题、粗体文本、要点）。
  - 回答形式应为 {response_type}。

4. 参考文献部分格式：
  - 参考文献部分应在标题下：`### 参考文献`
  - 参考文献列表条目应遵守格式：`* [n] 文档标题`。不要在左方括号 `[` 后包含脱字符 (`^`)。
  - 引用中的文档标题必须保留其原始语言。
  - 每个引用输出一行。
  - 最多提供 5 个最相关的引用。
  - 不要在参考文献之后生成脚注部分或任何评论、摘要或解释。

5. 参考文献部分示例：
```
### 参考文献

- [1] 文档标题一
- [2] 文档标题二
- [3] 文档标题三
```

6. 附加指令：{user_prompt}


---上下文---

{context_data}
"""

PROMPTS["naive_rag_response"] = """---角色---

你是一位专业的 AI 助手，擅长从提供的知识库中综合信息。你的主要职能是*仅*使用提供的**上下文**中的信息准确回答用户查询。

---目标---

生成一个全面、结构良好的用户查询答案。
答案必须整合在**上下文**中发现的文档块中的相关事实。
如果提供了对话历史，请考虑它以保持对话流畅并避免重复信息。

---指令---

1. 分步说明：
  - 在对话历史的背景下仔细确定用户的查询意图，以充分理解用户的信息需求。
  - 仔细审查**上下文**中的`文档块`。识别并提取所有与回答用户查询直接相关的信息片段。
  - 将提取的事实编织成一个连贯且合乎逻辑的回答。你自己的知识*仅*用于构建流畅的句子和连接想法，*不得*引入任何外部信息。
  - 跟踪直接支持回答中陈述的事实的文档块的 reference_id。将 reference_id 与 `参考文档列表` 中的条目相关联，以生成适当的引用。
  - 在回答末尾生成一个**参考文献**部分。每个参考文档必须直接支持回答中陈述的事实。
  - 不要在参考文献部分之后生成任何内容。

2. 内容与依据：
  - 严格遵守**上下文**中提供的内容；**不得**编造、假设或推断任何未明确陈述的信息。
  - 如果在**上下文**中找不到答案，请说明你没有足够的信息来回答。不要试图猜测。

3. 格式与语言：
  - 回答必须使用与用户查询相同的语言。
  - 回答必须使用 Markdown 格式以增强清晰度和结构（例如，标题、粗体文本、要点）。
  - 回答形式应为 {response_type}。

4. 参考文献部分格式：
  - 参考文献部分应在标题下：`### 参考文献`
  - 参考文献列表条目应遵守格式：`* [n] 文档标题`。不要在左方括号 `[` 后包含脱字符 (`^`)。
  - 引用中的文档标题必须保留其原始语言。
  - 每个引用输出一行。
  - 最多提供 5 个最相关的引用。
  - 不要在参考文献之后生成脚注部分或任何评论、摘要或解释。

5. 参考文献部分示例：
```
### 参考文献

- [1] 文档标题一
- [2] 文档标题二
- [3] 文档标题三
```

6. 附加指令：{user_prompt}


---上下文---

{content_data}
"""

PROMPTS["kg_query_context"] = """
知识图谱数据 (实体):

```json
{entities_str}
```

知识图谱数据 (关系):

```json
{relations_str}
```

文档块 (每个条目都有一个 reference_id 指向 `参考文档列表`):

```json
{text_chunks_str}
```

参考文档列表 (每个条目以 [reference_id] 开头，对应于文档块中的条目):

```
{reference_list_str}
```

"""

PROMPTS["naive_query_context"] = """
文档块 (每个条目都有一个 reference_id 指向 `参考文档列表`):

```json
{text_chunks_str}
```

参考文档列表 (每个条目以 [reference_id] 开头，对应于文档块中的条目):

```
{reference_list_str}
```

"""

PROMPTS["keywords_extraction"] = """---角色---
你是一名专业的关键词提取专家，擅长分析检索增强生成 (RAG) 系统的用户查询。你的目的是识别用户查询中的高级和低级关键词，以便进行有效的文档检索。

---目标---
给定一个用户查询，你的任务是提取两种不同类型的关键词：
1. **high_level_keywords**：用于总体概念或主题，捕捉用户的核心意图、学科领域或所问问题的类型。
2. **low_level_keywords**：用于具体实体或细节，识别具体的实体、专有名词、技术术语、产品名称或具体项目。

---指令与约束---
1. **输出格式**：你的输出必须是有效的 JSON 对象，且不能包含其他内容。不要在 JSON 之前或之后包含任何解释性文本、markdown 代码围栏（如 ```json）或其他任何文本。它将被 JSON 解析器直接解析。
2. **事实来源**：所有关键词必须明确源自用户查询，高级和低级关键词类别都必须包含内容。
3. **简明扼要**：关键词应为简明的单词或有意义的短语。当多词短语代表单个概念时，优先使用多词短语。例如，从“苹果公司的最新财务报告”中，你应该提取“最新财务报告”和“苹果公司”，而不是“最新”、“财务”、“报告”和“苹果”。
4. **处理边缘情况**：对于太简单、模糊或无意义的查询（例如“你好”、“好的”、“asdfghjkl”），你必须返回一个两个关键词类型都为空列表的 JSON 对象。
5. **语言**：所有提取的关键词必须使用 {language}。专有名词（例如人名、地名、组织名）应保留其原始语言。

---示例---
{examples}

---真实数据---
用户查询：{query}

---输出---
Output:"""

PROMPTS["keywords_extraction_examples"] = [
    """示例 1:

查询: "国际贸易如何影响全球经济稳定性？"

输出:
{
  "high_level_keywords": ["国际贸易", "全球经济稳定性", "经济影响"],
  "low_level_keywords": ["贸易协定", "关税", "货币汇率", "进口", "出口"]
}

""",
    """示例 2:

查询: "森林砍伐对生物多样性有哪些环境后果？"

输出:
{
  "high_level_keywords": ["环境后果", "森林砍伐", "生物多样性丧失"],
  "low_level_keywords": ["物种灭绝", "栖息地破坏", "碳排放", "雨林", "生态系统"]
}

""",
    """示例 3:

查询: "教育在减少贫困中的作用是什么？"

输出:
{
  "high_level_keywords": ["教育", "减贫", "社会经济发展"],
  "low_level_keywords": ["入学机会", "识字率", "职业培训", "收入不平等"]
}

""",
]
