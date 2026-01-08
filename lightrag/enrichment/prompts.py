"""实体丰富 Prompt 模板

提供用于实体属性丰富的 Prompt 模板。
"""

from lightrag.prompt import PROMPTS

# 实体丰富 Prompt
DEFAULT_ENRICHMENT_PROMPT = """---Role---
You are an expert Knowledge Graph Enrichment Specialist. Your task is to enrich entity information with additional details, attributes, and context.

---Task---
Enrich the following entity with additional information, attributes, and a comprehensive description.

---Entity Information---
Entity Name: {entity_name}
Entity Type: {entity_type}
Current Description: {description}

{ontology_guidance}

---Instructions---
1. **Generate a Comprehensive Description**: Create a detailed, informative description of the entity that:
   - Expands on the basic information provided
   - Includes relevant context, background, and significance
   - Is written in {language}
   - Maintains factual accuracy (do not invent information)

2. **Extract Attributes**: Identify and extract relevant attributes for this entity:
   - Use the expected attributes listed in the ontology guidance (if provided)
   - Add any other relevant attributes that help characterize the entity
   - Ensure attribute values are accurate and specific

3. **Output Format**: Return your response as a JSON object with the following structure:

```json
{{
    "description": "A comprehensive description of the entity...",
    "attributes": {{
        "attribute1": "value1",
        "attribute2": "value2",
        ...
    }}
}}
```

4. **Quality Guidelines**:
   - The description should be informative but concise (typically 2-4 sentences)
   - Only include attributes that are factual and relevant
   - If you cannot confidently determine an attribute value, omit it
   - Maintain consistency with the entity type

---Output---
Provide your enrichment result in the specified JSON format:
"""

# 注册到 PROMPTS 字典
PROMPTS["entity_enrichment_prompt"] = DEFAULT_ENRICHMENT_PROMPT
