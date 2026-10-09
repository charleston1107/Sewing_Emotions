(() => {
  const STORAGE_KEY = "sewing-emotions-language";
  const directMessages = {
    "Account": "账户",
    "Emotion Library": "情绪收藏夹",
    "Return Home": "返回首页",
    "Last Step": "上一步",
    "All Characters": "全部情绪",
    "Return to Archive": "返回档案",
    "Shape": "形状",
    "Color": "颜色",
    "Face": "表情",
    "Generate": "生成",
    "Finish": "完成",
    "Next": "下一步",
    "Send": "发送",
    "Library": "收藏夹",
    "skip": "跳过",
    "Eyebrows": "眉毛",
    "Eyes": "眼睛",
    "Mouth": "嘴巴",
    "Welcome to sewing emotions.": "欢迎来到 Sewing Emotions。",
    "Have you ever tried to look at your negative emotions carefully.": "你是否曾认真地看一看自己的负面情绪？",
    "Understand them.": "理解它们。",
    "Talk to them.": "和它们对话。",
    "Your negative emotions will be seen here.": "你的负面情绪会在这里被看见。",
    "And your will turn them into plushies with your own hand.": "你也会亲手把它们变成毛绒玩偶。",
    "Before you start designing the plushie,": "在开始设计毛绒玩偶之前，",
    "Let's take a moment to calm down and breathe.": "让我们先花一点时间安静下来，好好呼吸。",
    "Follow the rhythm to take a deep breath": "跟随节奏，慢慢地深呼吸",
    "Choose the shape that can best represent your current emotions.\nDrag and drop them onto the canvas.": "选择最能代表你此刻情绪的形状。\n将它们拖放到画布上。",
    "You can organize your shapes approximately within the reference lines. You can also change size or rotate your shapes.": "你可以参考虚线安排形状，也可以改变它们的大小或旋转它们。",
    "Enjoy designing your emotion plushie!": "享受设计你的情绪毛绒玩偶吧！",
    "Select the shape by clicking on it. Click the desired color to give it a color.": "点击选择形状，再点击喜欢的颜色为它上色。",
    "If you're a beginner in sewing, using the same color for the whole plushie is a great place to start.": "如果你刚开始学习缝纫，可以先尝试让整个玩偶使用同一种颜色。",
    "Drag and drop facial expressions to your plushie.": "将面部表情拖放到你的毛绒玩偶上。",
    "Optionally, you can use the brush to draw on your plushie's face.": "你也可以使用画笔，在玩偶的脸上自由绘制。",
    "Generating...": "生成中…",
    "Preparing your drawing board...": "正在准备你的画板…",
    "Asking Gemini to reinterpret your shape...": "正在请 Gemini 重新诠释你的形状…",
    "No generated image yet.": "还没有生成图片。",
    "Plushie Reference": "玩偶参考图",
    "Fabric's Sewing Pattern": "布料轮廓图纸",
    "Generated plushie and sewing pattern": "生成的玩偶与布料轮廓图纸",
    "Generated plushie reference": "生成的玩偶参考图",
    "Generated fabric sewing pattern": "生成的布料轮廓图纸",
    "Now, you can start sewing your plushie. Reference your toolkit for sewing instructions.": "现在，你可以开始缝制毛绒玩偶了。请参考工具包中的缝纫说明。",
    "Now, you can start sewing your plushie. Reference the Sewing Instructions Handbook and Supplementary Tutorial Videos for instructions. The handbook can also be found in your toolkit.": "现在，你可以开始缝制毛绒玩偶了。请参考《缝纫说明手册》和补充教学视频；工具包中也附有这本手册。",
    "Keep breathing when your plushies comes together": "在玩偶逐渐成形时，记得继续呼吸",
    "Sewing Instructions Handbook": "缝纫说明手册",
    "Supplementary Tutorial Videos": "补充教学视频",
    "Back to Sewing": "返回缝纫页面",
    "Sewing resources": "缝纫资源",
    "Sewing handbook pages 1 and 2": "缝纫手册第 1、2 页",
    "Sewing handbook pages 3 and 4": "缝纫手册第 3、4 页",
    "Sewing handbook page 1": "缝纫手册第 1 页",
    "Sewing handbook page 2": "缝纫手册第 2 页",
    "Sewing handbook page 3": "缝纫手册第 3 页",
    "Sewing handbook page 4": "缝纫手册第 4 页",
    "Your emotion library": "你的情绪收藏夹",
    "Keep what you create": "保存你的创作",
    "Create an account so your emotion characters can stay with you and return in future visits.": "创建账户，让你的情绪角色陪伴你，并在以后再次回来。",
    "Log in": "登录",
    "Create account": "创建账户",
    "Name": "名字",
    "Email": "邮箱",
    "Password": "密码",
    "What should we call you?": "我们应该怎么称呼你？",
    "At least 6 characters": "至少 6 个字符",
    "Something went wrong. Please try again.": "出了点问题，请重试。",
    "That email and password did not match. Please try again.": "邮箱和密码不匹配，请重试。",
    "Please confirm your email before logging in.": "请先确认邮箱，再登录。",
    "You are logged in as": "你已登录为",
    "Open Emotion Library": "打开情绪收藏夹",
    "Log out": "退出登录",
    "Your private collection": "你的私人收藏",
    "Every character remembers the feeling and conversations you made together.": "每个角色都记得你们共同经历的感受与对话。",
    "Opening your library...": "正在打开你的收藏夹…",
    "No characters are resting here yet": "这里还没有情绪角色",
    "Create an emotion character and finish its conversation to save it in this library.": "创建一个情绪角色并完成对话，就可以把它保存在这里。",
    "Create your first character": "创建第一个角色",
    "Create another emotion": "创建另一个情绪",
    "A feeling lives here": "一种感受住在这里",
    "Rename": "重命名",
    "Delete": "删除",
    "Save": "保存",
    "Cancel": "取消",
    "Log in to open your private emotion library.": "登录后即可打开你的私人情绪收藏夹。",
    "Log in or create an account": "登录或创建账户",
    "A visual memory rests here": "一段视觉记忆留在这里",
    "Name:": "名字：",
    "Created At:": "创建时间：",
    "Emotions Carrying:": "承载的情绪：",
    "Talk to Me": "和我聊聊",
    "What we have said together": "我们一起说过的话",
    "Conversation Memories": "对话回忆",
    "No saved conversation yet.": "还没有保存的对话。",
    "Emotion": "情绪",
    "You": "你",
    "Please give this emotion a name.": "请给这个情绪取一个名字。",
    "Saving name...": "正在保存名字…",
    "Deleting...": "正在删除…",
    "Saving...": "正在保存…",
    "My emotion": "我的情绪",
    "Welcome | Sewing Emotions": "欢迎 | Sewing Emotions",
    "Breathe | Sewing Emotions": "呼吸 | Sewing Emotions",
    "Build a Shape | Sewing Emotions": "构建形状 | Sewing Emotions",
    "Choose Colors | Sewing Emotions": "选择颜色 | Sewing Emotions",
    "Add a Face | Sewing Emotions": "添加表情 | Sewing Emotions",
    "Generated Emotion | Sewing Emotions": "生成的情绪 | Sewing Emotions",
    "Sewing | Sewing Emotions": "缝制 | Sewing Emotions",
    "Sewing Instructions Handbook | Sewing Emotions": "缝纫说明手册 | Sewing Emotions",
    "Supplementary Tutorial Videos | Sewing Emotions": "补充教学视频 | Sewing Emotions",
    "Meet Your Emotion | Sewing Emotions": "认识你的情绪 | Sewing Emotions",
    "Your Account | Sewing Emotions": "你的账户 | Sewing Emotions",
    "Emotion Library | Sewing Emotions": "情绪收藏夹 | Sewing Emotions",
    "Switch language": "切换语言",
    "Message to emotion character": "给情绪角色发送消息",
    "Message to saved emotion character": "给已保存的情绪角色发送消息",
    "Creation progress": "创作进度",
    "Delete selected shape": "删除选中的形状",
    "Enable drawing": "启用绘画",
    "New emotion name": "新的情绪名字"
  };

  const semanticMessages = {
    "library.count.one": ["1 emotion character", "1 个情绪角色"],
    "library.count.many": ["{count} emotion characters", "{count} 个情绪角色"],
    "library.lastVisited": ["Last visited {date}", "上次访问：{date}"],
    "library.unnamed": ["An emotion still finding its name", "一个仍在寻找名字的情绪"],
    "library.mayHold": ["May be holding {emotions}", "可能承载着 {emotions}"],
    "library.openError": ["Your library could not load. {error}", "无法打开你的收藏夹。{error}"],
    "library.characterMissing": ["This character was not found, or you need to log in to open it.", "找不到这个角色，或者你需要先登录。"],
    "library.characterLoadError": ["This character could not load. {error}", "无法载入这个角色。{error}"],
    "library.openingBox": ["Opening this emotion box...", "正在打开这个情绪盒子…"],
    "library.deleteConfirm": ["Delete {name} and all of this character's conversations? This cannot be undone.", "删除 {name} 以及这个角色的所有对话吗？此操作无法撤销。"],
    "library.deleteError": ["The character could not be deleted. {error}", "无法删除这个角色。{error}"],
    "account.loggedOut": ["You have been logged out.", "你已退出登录。"],
    "account.confirmEmail": ["Check your email to confirm your account. You can return here after confirming it.", "请查看邮箱并确认账户。确认后可以返回这里。"],
    "account.yourAccount": ["Your account", "你的账户"],
    "home.sewnComplete": ["All cloths sewn — lovely work", "所有布料都缝好了——做得真棒"],
    "home.sewnProgress": ["{done} of {total} cloths sewn", "已缝好 {done}/{total} 块布料"]
  };

  const excludedContentSelector = [
    ".character-chat-bubble p",
    ".memory-message-content",
    ".library-card-copy h2",
    ".library-card-copy p",
    ".library-detail-name",
    ".memory-name-display",
    ".memory-name-form input",
    ".memory-emotions"
  ].join(", ");
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  const reverseMessages = new Map(Object.entries(directMessages).map(([en, cn]) => [cn, en]));
  let storedLanguage = "";
  try {
    storedLanguage = localStorage.getItem(STORAGE_KEY) || "";
  } catch (error) {
    console.warn("The language preference could not be read.", error);
  }
  let language = storedLanguage === "cn" ? "cn" : "en";

  function interpolate(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? "");
  }

  function t(key, values = {}) {
    const semantic = semanticMessages[key];
    const template = semantic
      ? semantic[language === "cn" ? 1 : 0]
      : language === "cn" ? directMessages[key] || key : reverseMessages.get(key) || key;
    return interpolate(template, values);
  }

  function shouldSkip(element) {
    return !element
      || element.matches("script, style")
      || Boolean(element.closest(excludedContentSelector));
  }

  function translateTextNodes(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const element = node.parentElement;
      const raw = node.nodeValue || "";
      const trimmed = raw.trim();
      if (trimmed && !shouldSkip(element)) {
        let source = textSources.get(node);
        if (!source) {
          source = reverseMessages.get(trimmed) || trimmed;
          textSources.set(node, source);
        }
        const translated = t(source);
        if (translated !== source || directMessages[source]) {
          node.nodeValue = raw.replace(trimmed, translated);
        }
      }
      node = walker.nextNode();
    }
  }

  function translateAttributes(root = document) {
    root.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => {
      if (element.matches(excludedContentSelector)) return;
      let sources = attributeSources.get(element);
      if (!sources) {
        sources = {};
        attributeSources.set(element, sources);
      }
      ["placeholder", "aria-label", "title"].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        if (!sources[attribute]) {
          const current = element.getAttribute(attribute);
          sources[attribute] = reverseMessages.get(current) || current;
        }
        element.setAttribute(attribute, t(sources[attribute]));
      });
    });
  }

  function translateDocument() {
    document.documentElement.lang = language === "cn" ? "zh-CN" : "en";
    document.title = t(reverseMessages.get(document.title) || document.title);
    translateTextNodes();
    translateAttributes();
    document.querySelectorAll(".language-toggle").forEach((button) => {
      button.textContent = "EN/中文";
      button.setAttribute("aria-label", t("Switch language"));
      button.setAttribute("aria-pressed", String(language === "cn"));
    });
  }

  function setLanguage(nextLanguage) {
    language = nextLanguage === "cn" ? "cn" : "en";
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      console.warn("The language preference could not be saved.", error);
    }
    translateDocument();
    window.dispatchEvent(new CustomEvent("sewing-language-change", { detail: { language } }));
  }

  window.sewingI18n = {
    get language() {
      return language;
    },
    t,
    translateDocument,
    setLanguage
  };

  document.querySelectorAll(".language-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(language === "en" ? "cn" : "en");
    });
  });

  translateDocument();
})();
