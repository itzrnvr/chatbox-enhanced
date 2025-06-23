import { useSetAtom } from 'jotai'
import mermaid from 'mermaid'
import { useEffect, useState, useMemo } from 'react'
import * as atoms from '@/stores/atoms'
import { ChartBarStacked } from 'lucide-react'
import { Img } from './Image'
import { copyToClipboard } from '@/packages/navigator'
import { cn } from '@/lib/utils'
import DataObjectIcon from '@mui/icons-material/DataObject'
import * as toastActions from '../stores/toastActions'
import { useTranslation } from 'react-i18next'
import * as picUtils from '@/packages/pic_utils'

export function MessageMermaid(props: { source: string; theme: 'light' | 'dark'; generating?: boolean }) {
  const { source, theme, generating } = props

  const [svgId, setSvgId] = useState('')
  const [svgCode, setSvgCode] = useState('')
  useEffect(() => {
    if (generating) {
      return
    }
    ;(async () => {
      const { id, svg } = await mermaidCodeToSvgCode(source, theme)
      setSvgCode(svg)
      setSvgId(id)
    })()
  }, [source, theme, generating])

  if (generating) {
    // 测试下来，发现这种方法是视觉效果最好的。
    // 如果根据 mermaid 是否正常渲染来判断，有时候残缺的 mermaid 也可以渲染出部分图形，这会造成视觉上的闪屏混乱。
    return <Loading />
  }

  return (
    // <SVGPreview xmlCode={svgCode} />
    <MermaidSVGPreviewDangerous svgId={svgId} svgCode={svgCode} mermaidCode={source} />
  )
}

export function Loading() {
  return (
    <div className="inline-flex items-center gap-2 border border-solid border-gray-500 rounded-md p-2 my-2">
      <ChartBarStacked size={30} strokeWidth={1} />
      <span>Loading...</span>
    </div>
  )
}

/**
 * 直接将 svg 代码注入到页面中，通过浏览器自身的修复能力处理 svg 代码，再通过 serializeToString 得到规范的 svg 代码。
 * 经过各种测试，发现有时候 mermaid 生成的 svg 代码并不规范，直接转化 base64 将无法完整显示。
 * 这里的做法是直接将 svg 代码注入到页面中，通过浏览器自身的修复能力处理 svg 代码，再通过 serializeToString 得到规范的 svg 代码。
 */
export function MermaidSVGPreviewDangerous(props: {
  svgCode: string
  svgId: string
  mermaidCode: string
  className?: string
  generating?: boolean
}) {
  const { svgId, svgCode, mermaidCode, className, generating } = props
  const { t } = useTranslation()
  const setPictureShow = useSetAtom(atoms.pictureShowAtom)
  if (!svgCode.includes('</svg') && generating) {
    return <Loading />
  }
  return (
    <div className={cn('my-2', className)}>
      {/* Copy raw code button always visible */}
      <button
        className="mb-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 dark:text-gray-100 text-xs font-mono"
        onClick={() => {
          copyToClipboard(mermaidCode)
          toastActions.add(t('copied to clipboard'))
        }}
        style={{ float: 'right' }}
        title="Copy raw Mermaid code"
      >
        Copy raw code
      </button>
      {/* 这里直接注入了 svg 代码 */}
      <div
        className="cursor-pointer"
        onClick={async () => {
          const svg = document.getElementById(svgId)
          if (!svg) {
            return
          }
          const serializedSvgCode = new XMLSerializer().serializeToString(svg)
          const base64 = picUtils.svgCodeToBase64(serializedSvgCode)
          const pngBase64 = await picUtils.svgToPngBase64(base64)
          setPictureShow({
            picture: {
              url: pngBase64,
            },
          })
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: svgCode }} />
      </div>
    </div>
  )
}

export function SVGPreview(props: { xmlCode: string; className?: string; generating?: boolean }) {
  let { xmlCode, className, generating } = props
  const setPictureShow = useSetAtom(atoms.pictureShowAtom)
  const svgBase64 = useMemo(() => {
    if (!xmlCode.includes('</svg') && generating) {
      return ''
    }
    // xmlns 属性告诉浏览器该 XML 文档使用的是 SVG 命名空间，缺少该属性会导致浏览器无法正确渲染 SVG 代码。
    if (!xmlCode.includes('xmlns="http://www.w3.org/2000/svg"')) {
      xmlCode = xmlCode.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    }
    try {
      return picUtils.svgCodeToBase64(xmlCode)
    } catch (e) {
      console.error(e)
      return ''
    }
  }, [xmlCode, generating])
  if (!svgBase64) {
    return <Loading />
  }
  return (
    <div
      className={cn('cursor-pointer my-2', className)}
      onClick={async () => {
        // 图片预览窗口中直接显示 png 图片。因为在实际测试中发现，桌面端无法正常显示 SVG 图片，但网页端可以。
        const pngBase64 = await picUtils.svgToPngBase64(svgBase64)
        setPictureShow({
          picture: { url: pngBase64 },
        })
      }}
    >
      <Img src={svgBase64} />
    </div>
  )
}

async function mermaidCodeToSvgCode(source: string, theme: 'light' | 'dark') {
  mermaid.initialize({ theme: theme === 'light' ? 'default' : 'dark' })
  const id = 'mermaidtmp' + Math.random().toString(36).substring(2, 15)
  
  let sanitizedSource = source;
  
  // First protect time formats (e.g. "90m:") by quoting them
  sanitizedSource = sanitizedSource.replace(/(\w+)\[([^\]]*)\]/g, (match, id, text) => {
    // If text contains time format like "90m:" and is not already quoted
    if (text.match(/\d+m:/) && !(text.startsWith('"') && text.endsWith('"'))) {
      const escapedText = text.replace(/"/g, '""');
      return `${id}["${escapedText}"]`;
    }
    return match;
  });

  // Then remove actual ANSI escape codes
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /[\u001b\u009b][[()#;?]*.{0,2}(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  sanitizedSource = sanitizedSource.replace(ansiRegex, '');

  // Auto-correct common Mermaid mistake: quote node text containing colons
  sanitizedSource = sanitizedSource.replace(/(\w+)\[([^\]]*)\]/g, (match, id, text) => {
    // If text contains a colon and is not already quoted
    if (text.includes(':') && !(text.startsWith('"') && text.endsWith('"'))) {
      const escapedText = text.replace(/"/g, '""'); // Mermaid uses "" to escape quotes
      return `${id}["${escapedText}"]`;
    }
    return match;
  });

  // Validate syntax and render with error fallback
  try {
    await mermaid.parse(sanitizedSource);
    const result = await mermaid.render(id, sanitizedSource);
    return { id, svg: result.svg };
  } catch (error) {
    console.error('Mermaid syntax error:', error);
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
    // Sanitize error message for SVG embedding
    const sanitizedErrorMessage = errorMessage
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');

    // Fallback to a placeholder SVG with the detailed error message
    const errorSvg = `<svg width="100%" height="200" xmlns="http://www.w3.org/2000/svg">
      <style>
        .title { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #D32F2F; }
        .message { font-family: 'Courier New', monospace; font-size: 12px; fill: #333; }
      </style>
      <rect width="100%" height="100%" fill="#FFF0F0" stroke="#D32F2F" stroke-width="1"/>
      <text x="10" y="25" class="title">Mermaid Diagram Failed to Render</text>
      <text x="10" y="50" class="message">
        ${sanitizedErrorMessage.split('\n').map((line, index) => `<tspan x="10" dy="${index === 0 ? 0 : '1.2em'}">${line}</tspan>`).join('')}
      </text>
    </svg>`;
    return { id, svg: errorSvg };
  }
}
