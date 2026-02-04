import { useEffect, useMemo, useState } from 'react'
import { Table, Input, Button, Modal, message, Space, Select, Switch, Tag, Form } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import apiOrder from '@/components/apis/apiOrder'

/**
 * ProductionMonitors.tsx (Vite + TS + AntD)
 * CRUD de monitores de producción + asignación de áreas de impresión (areas_impresions)
 *
 * ENDPOINTS esperados (ajusta si tus rutas difieren):
 *  - GET    /productionMonitors
 *  - POST   /productionMonitors           body { name, mode, isEnabled }
 *  - PUT    /productionMonitors/:id       body { name?, mode?, isEnabled? }
 *  - DELETE /productionMonitors/:id
 *  - GET    /productionMonitors/:id/areas           → devuelve [number] o [{id,name}]
 *  - POST   /productionMonitors/:id/areas           body { printAreaIds: number[] }  (reemplaza asignación)
 *  - GET    /areasImpresion                         → listado de áreas (id, name)
 */

// Tipos
interface AreaImpresion { id: number; name: string }

interface ProductionMonitor {
  id: number
  restaurantId?: number
  code: string
  name: string
  mode: 'kitchen' | 'bar' | 'expo'
  isEnabled: boolean
  settings?: any
}

// Utilidades
const MODE_OPTIONS = [
  { label: 'Cocina', value: 'kitchen' },
  { label: 'Bar', value: 'bar' },
  { label: 'Expo', value: 'expo' },
]

export default function ProductionMonitors() {
  const [monitors, setMonitors] = useState<ProductionMonitor[]>([])
  const [areas, setAreas] = useState<AreaImpresion[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  // asignaciones: monitorId -> [areaIds]
  const [assigned, setAssigned] = useState<Record<number, number[]>>({})

  // Crear/editar monitor
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductionMonitor | null>(null)
  const [form] = Form.useForm<Partial<ProductionMonitor>>()

  // Modal de asignación de áreas
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<ProductionMonitor | null>(null)
  const [assignSelectedIds, setAssignSelectedIds] = useState<number[]>([])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return monitors
    return monitors.filter((m) =>
      [m.code, m.name, m.mode].some((x) => String(x).toLowerCase().includes(q))
    )
  }, [search, monitors])

  async function fetchAreas() {
    const res = await apiOrder.get('/areasImpresion')
    const list: AreaImpresion[] = res.data || []
    setAreas(list)
  }

  async function fetchMonitors() {
    const res = await apiOrder.get('/productionMonitors')
    const rows: ProductionMonitor[] = res.data || []
    setMonitors(rows)
    // cargar asignaciones en paralelo
    const pairs = await Promise.all(
      rows.map(async (m) => {
        try {
          const r = await apiOrder.get(`/productionMonitors/${m.id}/areas`)
          const data = r.data as any
          // soporta [id] o [{id}]
          const ids: number[] = Array.isArray(data)
            ? data.map((x: any) => (typeof x === 'number' ? x : x?.id)).filter(Boolean)
            : []
          return [m.id, ids] as const
        } catch {
          return [m.id, []] as const
        }
      })
    )
    setAssigned(Object.fromEntries(pairs))
  }

  async function refreshAll() {
    setLoading(true)
    try {
      await Promise.all([fetchAreas(), fetchMonitors()])
    } catch (e) {
      message.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()
  }, [])

  // CRUD Monitores
  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ mode: 'kitchen', isEnabled: true })
    setIsModalOpen(true)
  }

  function openEdit(m: ProductionMonitor) {
    setEditing(m)
    form.setFieldsValue({ name: m.name, mode: m.mode, isEnabled: m.isEnabled })
    setIsModalOpen(true)
  }

  async function handleSave() {
    const values = await form.validateFields()
    try {
      if (editing) {
        await apiOrder.put(`/productionMonitors/${editing.id}`, values)
        message.success('Monitor actualizado')
      } else {
        await apiOrder.post('/productionMonitors', values)
        message.success('Monitor creado')
      }
      setIsModalOpen(false)
      await fetchMonitors()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'No se pudo guardar')
    }
  }

  async function handleDelete(id: number) {
    Modal.confirm({
      title: 'Eliminar monitor',
      content: '¿Seguro que deseas eliminar este monitor?',
      okType: 'danger',
      onOk: async () => {
        try {
          await apiOrder.delete(`/productionMonitors/${id}`)
          message.success('Monitor eliminado')
          await fetchMonitors()
        } catch {
          message.error('No se pudo eliminar')
        }
      },
    })
  }

  // Asignación de áreas
  function openAssign(m: ProductionMonitor) {
    setAssignTarget(m)
    const current = assigned[m.id] || []
    setAssignSelectedIds(current)
    setAssignModalOpen(true)
  }

  async function saveAssign() {
    if (!assignTarget) return
    try {
      await apiOrder.post(`/productionMonitors/${assignTarget.id}/areas`, {
        printAreaIds: assignSelectedIds,
      })
      message.success('Áreas asignadas')
      setAssignModalOpen(false)
      // refrescar solo ese monitor en memoria
      setAssigned((prev) => ({ ...prev, [assignTarget.id]: [...assignSelectedIds] }))
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'No se pudo asignar')
    }
  }

  const columns = [
    { title: 'Código', dataIndex: 'code', key: 'code' },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    {
      title: 'Sección',
      dataIndex: 'mode',
      key: 'mode',
      render: (v: ProductionMonitor['mode']) => {
        const map: Record<string, string> = { kitchen: 'Cocina', bar: 'Bar', expo: 'Expo' }
        return map[v] || v
      },
    },
    {
      title: 'Estatus',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      render: (v: boolean) => (v ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>),
    },
    {
      title: 'Áreas asignadas',
      key: 'areas',
      render: (_: any, m: ProductionMonitor) => {
        const ids = assigned[m.id] || []
        if (!ids.length) return <span className="opacity-60">—</span>
        const names = ids
          .map((id) => areas.find((a) => a.id === id)?.name)
          .filter(Boolean)
          .join(', ')
        return <span className="text-xs">{names}</span>
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, m: ProductionMonitor) => (
        <Space>
          <Button size="small" onClick={() => openEdit(m)}>Editar</Button>
          <Button size="small" onClick={() => openAssign(m)}>Asignar áreas</Button>
          <Button size="small" danger onClick={() => handleDelete(m.id)}>Eliminar</Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <Input
          placeholder="Buscar por código/nombre/sección"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          allowClear
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refreshAll}>Recargar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo monitor
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns as any}
        dataSource={filtered}
        loading={loading}
      />

      {/* Modal crear/editar monitor */}
      <Modal
        title={editing ? 'Editar monitor' : 'Nuevo monitor'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        okText={editing ? 'Actualizar' : 'Crear'}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}> 
            <Input placeholder="KDS Cocina 1" />
          </Form.Item>
          <Form.Item name="mode" label="Sección" rules={[{ required: true }]}> 
            <Select options={MODE_OPTIONS} />
          </Form.Item>
          <Form.Item name="isEnabled" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal asignar áreas */}
      <Modal
        title={assignTarget ? `Asignar áreas • ${assignTarget.name}` : 'Asignar áreas'}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={saveAssign}
        okText="Guardar"
        destroyOnClose
      >
        <p className="mb-2 text-sm opacity-80">Selecciona una o varias áreas de impresión</p>
        <Select
          mode="multiple"
          className="w-full"
          value={assignSelectedIds}
          onChange={(vals) => setAssignSelectedIds(vals)}
          options={areas.map((a) => ({ label: a.name, value: a.id }))}
          placeholder="Elige áreas"
          showSearch
          optionFilterProp="label"
        />
      </Modal>
    </div>
  )
}
