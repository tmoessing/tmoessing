# Resume Website - Content Management

## How to Edit Your Resume

All your resume content is now managed through the **`content.md`** file. Simply edit this file to update your website - no need to touch the HTML!

### Quick Start

1. Open `content.md` in any text editor
2. Edit the content you want to change
3. Save the file
4. Refresh your browser to see the changes

### Content Structure

The `content.md` file is organized into sections:

#### Profile
```markdown
## Profile
name: Tyler Moessing
title: CS Student @ BYU | ML Enthusiast
photo: resources/profile_pic.jpeg
```

#### Contact Links
```markdown
## Contact
email: tyler@moessing.com
linkedin: https://www.linkedin.com/in/tmoessing/
github: https://github.com/tmoessing
```

#### About Section
```markdown
## About
Your main bio paragraph goes here...

### Extended
Additional information that appears when "Read More" is clicked...
```

#### Experience
Each job is a subsection with the format:
```markdown
### Job Title
company: Company Name
dates: 2023 - Present
description: What you did in this role...
tags: Python, Data Analysis, Visualization
```

#### Education
Similar format to experience:
```markdown
### Degree Name
institution: University Name
graduation: April 2027
gpa: 3.98
emphasis: Your Focus Area
minor: Your Minor
honors: Awards or honors
coursework: Course 1, Course 2, Course 3
```

#### Projects
```markdown
### Project Name
image: resources/project_image.jpg
description: Project description...
link: https://project-url.com
tags: React, TypeScript
status: live OR in-development
note: Optional note like "Est. 2 years"
```

#### Skills
```markdown
### Category Name
Skill 1, Skill 2, Skill 3
```

#### Interests
```markdown
### Interest Title
description: Description of the interest...
```

For helpful resources:
```markdown
- Resource Name | https://resource-url.com
```

### Tips

- **No HTML needed**: Just edit the markdown file
- **Comma-separated lists**: Use commas for tags, skills, and coursework
- **URLs**: Just paste the full URL, no special formatting needed
- **Images**: Reference images in the `resources/` folder
- **Status options**: Use `live` or `in-development` for project status

### File Structure

```
tyler.moessing/
├── index.html          (Don't edit - auto-populated)
├── styles.css          (Edit for design changes)
├── content.md          (Edit this for content changes!)
├── content-loader.js   (Don't edit - handles loading)
└── resources/          (Your images go here)
```

### Troubleshooting

**Changes not showing?**
- Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for errors (F12)
- Make sure `content.md` is saved

**Content looks weird?**
- Check formatting in `content.md`
- Make sure key-value pairs use format `key: value`
- Ensure subsections start with `###`

**Want to add a new section?**
- Follow the existing patterns in `content.md`
- You may need to update `content-loader.js` for completely new section types
