import { defineConfig } from "tinacms";

export default defineConfig({
  branch: "main",
  clientId: null, // Left null for local / token-based setups
  token: null,    
  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "images/blog",
      publicFolder: "public",
    },
  },
  schema: {
    collections: [
      {
        name: "post",
        label: "Blog Posts",
        path: "src/content/blog",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          { type: "string", name: "description", label: "Description", ui: { component: "textarea" } },
          { type: "datetime", name: "pubDate", label: "Publish Date" },
          { type: "datetime", name: "updatedDate", label: "Updated Date" },
          { type: "image", name: "heroImage", label: "Hero Image" },
          { type: "string", name: "author", label: "Author" },
          { type: "string", name: "tags", label: "Tags", list: true },
          { type: "string", name: "category", label: "Category" },
          { type: "rich-text", name: "body", label: "Body", isBody: true },
        ],
      },
    ],
  },
});
