# Meal cover images

Drop a cover photo here named after the meal's slug (the `.md` filename):

```
meals/images/chicken-alfredo.jpg
meals/images/tacos.jpg
```

Each meal's frontmatter points at `../meals/images/<slug>.jpg`. If the file is
missing, the card and modal fall back to a generated gradient placeholder with
the meal's initials — so photos are optional and can be added any time with no
code change. JPG or PNG both work; keep them reasonably sized (≤ ~500 KB).
