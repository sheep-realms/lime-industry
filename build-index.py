import json
import os


ATTRIBUTE_TAG_RULES = {
    "test": {
        True: "test"
    }
}


def generate_attribute_tags(attribute):
    tags = []

    if not isinstance(attribute, dict):
        return tags

    for key, value_rules in ATTRIBUTE_TAG_RULES.items():
        value = attribute.get(key)

        if value is None:
            continue

        tag = value_rules.get(value)

        if tag:
            tags.append(tag)

    return tags


def create_index():
    base_dir = os.getcwd()
    schematic_dir = os.path.join(base_dir, "schematic")
    index_file = os.path.join(schematic_dir, "index.json")

    index_data = []

    for root, _, files in os.walk(schematic_dir):
        for file in files:
            if not file.lower().endswith(".json"):
                continue

            file_path = os.path.join(root, file)

            relative_path = os.path.relpath(file_path, schematic_dir)
            if len(relative_path.split(os.sep)) <= 1:
                continue

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                if not all(key in data for key in ("title", "path", "icon", "tags")):
                    print(f"跳过缺少字段的文件: {relative_path}")
                    continue

                tags = list(data["tags"])

                auto_tags = generate_attribute_tags(
                    data.get("attribute")
                )

                for tag in auto_tags:
                    if tag not in tags:
                        tags.append(tag)

                index_data.append({
                    "title": data["title"],
                    "path": data["path"],
                    "icon": data["icon"],
                    "tags": tags
                })

            except json.JSONDecodeError:
                print(f"跳过无效 JSON 文件: {relative_path}")

            except Exception as e:
                print(f"读取失败 {relative_path}: {e}")

    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index_data, f, ensure_ascii=False, indent=4)

    print(f"索引创建完成，共 {len(index_data)} 条记录")


if __name__ == "__main__":
    create_index()